import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { DbService } from '../db/db.service';
import { MessagesService } from '../messages/messages.service';
import { OnlineGateway } from '../online/online.gateway';
import { ProfilesService } from '../profiles/profiles.service';
import { CreateMeetRequestDto, RespondToMeetRequestDto } from './dto';

type MeetRequestRow = Record<string, any> & {
  id: string;
  code: string;
  owner_nickname: string;
};

// Unguessable share code (crypto-random, 16 hex chars ≈ 64 bits) — not enumerable.
// Old 6-char Math.random codes keep working (looked up by exact match).
function makeCode() {
  return randomBytes(8).toString('hex');
}

@Injectable()
export class RequestsService {
  constructor(
    private readonly db: DbService,
    private readonly profiles: ProfilesService,
    private readonly messages: MessagesService,
    private readonly realtime: OnlineGateway,
  ) {}

  async create(dto: CreateMeetRequestDto, ownerProfileId?: string) {
    const owner = ownerProfileId
      ? await this.profiles.findById(ownerProfileId)
      : dto.ownerNickname
      ? await this.profiles.findByNickname(dto.ownerNickname)
      : await this.profiles.findAdminProfile();
    const isNearby = dto.type === 'nearby';

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = makeCode();

      try {
        const result = await this.db.query(
          `insert into meet_requests
             (owner_profile_id, code, type, message, looking_for, radius, age_min, age_max, visible_on_map,
              place, display_as, custom_name, expires, contact)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           returning *`,
          [
            owner.id,
            code,
            dto.type,
            dto.message.trim(),
            isNearby ? dto.lookingFor ?? 'Всех' : 'Личная ссылка',
            isNearby ? dto.radius ?? 1000 : null,
            isNearby ? dto.ageMin ?? 18 : null,
            isNearby ? dto.ageMax ?? 35 : null,
            isNearby ? dto.visibleOnMap ?? true : false,
            dto.place?.trim() || null,
            dto.displayAs ?? 'profile',
            dto.customName?.trim() || null,
            dto.expires ?? '24h',
            dto.contact?.trim() || null,
          ],
        );

        return this.withResponses({
          ...result.rows[0],
          owner_nickname: owner.nickname,
          owner_name: owner.name,
        } as unknown as MeetRequestRow);
      } catch (error) {
        if ((error as { code?: string })?.code !== '23505' || attempt === 4) throw error;
      }
    }
  }

  async listForOwner(ownerProfileId?: string) {
    // Owner is REQUIRED — without it we must NOT return every account's requests and their
    // responders' private contact/messages.
    if (!ownerProfileId) return [];
    const result = await this.db.query<MeetRequestRow>(
      `select r.*, p.nickname as owner_nickname, p.name as owner_name
       from meet_requests r
       join profiles p on p.id = r.owner_profile_id
       where r.owner_profile_id = $1
       order by r.created_at desc`,
      [ownerProfileId],
    );

    return Promise.all(result.rows.map((row) => this.withResponses(row)));
  }

  async listForAdmin() {
    return this.listForOwner();
  }

  async findByCode(code: string) {
    const result = await this.db.query<MeetRequestRow>(
      `select r.*, p.nickname as owner_nickname, p.name as owner_name
       from meet_requests r
       join profiles p on p.id = r.owner_profile_id
       where r.code = $1`,
      [code],
    );

    const request = result.rows[0];
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    return this.withResponses(request);
  }

  // Public link page: expose only what a responder needs to reply. Never include
  // prior responders' contact/messages or the raw owner row.
  async findPublicByCode(code: string) {
    const result = await this.db.query<MeetRequestRow>(
      `select r.id, r.code, r.type, r.message, r.looking_for, r.place,
              r.display_as, r.custom_name, r.status, r.created_at, r.contact,
              p.nickname as owner_nickname, p.name as owner_name
       from meet_requests r
       join profiles p on p.id = r.owner_profile_id
       where r.code = $1`,
      [code],
    );

    const request = result.rows[0];
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    return request;
  }

  async respond(code: string, dto: RespondToMeetRequestDto, responderProfileId?: string) {
    const request = await this.findByCode(code);
    const accepted = dto.status === 'accepted';

    // A signed-in responder (other than the owner) links the chat to their real
    // profile, so both sides see it and names resolve. Replying to your own request
    // stays anonymous.
    const ownerProfileId = (request as Record<string, any>).owner_profile_id;
    const responder =
      responderProfileId && responderProfileId !== ownerProfileId
        ? await this.profiles.findById(responderProfileId).catch(() => null)
        : null;

    const alias =
      dto.alias?.trim() || responder?.nickname || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    const contact = dto.status === 'declined' ? '' : dto.contact?.trim();

    if (accepted && !contact) {
      throw new BadRequestException('Contact is required when request is accepted');
    }

    const message =
      dto.message?.trim() ||
      (accepted ? 'Принял(а) запрос.' : dto.status === 'new' ? 'Opened your link.' : 'Отказался без сообщения.');

    const result = await this.db.query(
      `insert into meet_request_responses
         (request_id, guest_nickname, age, contact, message, status)
       values ($1, $2, $3, $4, $5, $6)
       returning *`,
      [request.id, alias, dto.age ?? null, contact || null, message, dto.status],
    );

    let response = result.rows[0];
    let conversation: Record<string, any> | null = null;

    // Open a real conversation when the request is accepted OR a signed-in person
    // replies — so a logged-in reply is instantly a linked, two-way chat.
    if (accepted || responder) {
      conversation = await this.messages.startConversation(
        {
          ownerNickname: request.owner_nickname,
          guestNickname: responder?.nickname || alias,
          contact: contact || undefined,
          body: message,
          sender: 'guest',
          source: 'request',
        },
        undefined,
        responder?.id, // trusted (server-verified) guest profile id, or undefined
      );

      const responseResult = await this.db.query(
        `update meet_request_responses
         set conversation_id = $2
         where id = $1
         returning *`,
        [response.id, conversation.id],
      );
      response = responseResult.rows[0];
    }

    const payload = {
      ...this.mapResponse(response),
      conversation,
    };

    this.realtime.emitRequestResponse({
      request_code: request.code,
      owner_profile_id: (request as Record<string, any>).owner_profile_id,
      response: payload,
    });

    return payload;
  }

  private async withResponses(request: MeetRequestRow) {
    const responses = await this.db.query(
      `select *
       from meet_request_responses
       where request_id = $1
       order by created_at desc`,
      [request.id],
    );

    return {
      ...request,
      responses: responses.rows.map((row) => this.mapResponse(row)),
    };
  }

  private mapResponse(row: Record<string, any>) {
    return {
      id: row.id,
      alias: row.guest_nickname,
      age: row.age,
      contact: row.contact,
      message: row.message,
      status: row.status,
      conversation_id: row.conversation_id,
      created_at: row.created_at,
    };
  }
}
