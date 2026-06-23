import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { OnlineGateway } from '../online/online.gateway';
import { ProfilesService } from '../profiles/profiles.service';
import { SendMessageDto, StartConversationDto } from './dto';

@Injectable()
export class MessagesService {
  constructor(
    private readonly db: DbService,
    private readonly profiles: ProfilesService,
    private readonly realtime: OnlineGateway,
  ) {}

  async startConversation(dto: StartConversationDto, ownerProfileId?: string) {
    const owner = ownerProfileId
      ? await this.profiles.findById(ownerProfileId)
      : dto.ownerNickname
      ? await this.profiles.findByNickname(dto.ownerNickname)
      : await this.profiles.findAdminProfile();
    const guestNickname = dto.guestNickname?.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;

    const conversationResult = await this.db.query(
      `insert into conversations (owner_profile_id, guest_nickname, contact, source, updated_at)
       values ($1, $2, $3, $4, now())
       on conflict (owner_profile_id, guest_nickname) do update
       set contact = coalesce(excluded.contact, conversations.contact),
           source = excluded.source,
           updated_at = now()
       returning *`,
      [owner.id, guestNickname, dto.contact ?? null, dto.source ?? 'chat'],
    );

    const conversation = conversationResult.rows[0];
    const message = await this.addMessage(conversation.id, {
      sender: dto.sender ?? 'guest',
      body: dto.body,
    });

    const created = {
      ...conversation,
      messages: [message],
    };

    this.realtime.emitConversation(created);

    return created;
  }

  async listConversations(ownerProfileId?: string) {
    const params: unknown[] = [];
    let where = '';

    if (ownerProfileId) {
      params.push(ownerProfileId);
      where = 'where c.owner_profile_id = $1';
    }

    const result = await this.db.query(
      `select
         c.*,
         p.nickname as owner_nickname,
         last_message.body as last_message,
         last_message.sender as last_sender,
         last_message.created_at as last_message_at,
         coalesce(message_counts.total, 0)::int as message_count
       from conversations c
       join profiles p on p.id = c.owner_profile_id
       left join lateral (
         select body, sender, created_at
         from messages m
         where m.conversation_id = c.id
         order by m.created_at desc
         limit 1
       ) last_message on true
       left join lateral (
         select count(*) as total
         from messages m
         where m.conversation_id = c.id
       ) message_counts on true
       ${where}
       order by c.updated_at desc`,
      params,
    );

    return result.rows;
  }

  async getConversation(id: string, ownerProfileId?: string) {
    const params: unknown[] = [id];
    let ownerWhere = '';

    if (ownerProfileId) {
      params.push(ownerProfileId);
      ownerWhere = 'and c.owner_profile_id = $2';
    }

    const conversationResult = await this.db.query(
      `select c.*, p.nickname as owner_nickname
       from conversations c
       join profiles p on p.id = c.owner_profile_id
       where c.id = $1
       ${ownerWhere}`,
      params,
    );

    if (!conversationResult.rows[0]) {
      throw new NotFoundException('Conversation not found');
    }

    const messagesResult = await this.db.query(
      `select *
       from messages
       where conversation_id = $1
       order by created_at asc`,
      [id],
    );

    return {
      ...conversationResult.rows[0],
      messages: messagesResult.rows,
    };
  }

  async addMessage(conversationId: string, dto: SendMessageDto, ownerProfileId?: string) {
    const params: unknown[] = [conversationId];
    let ownerWhere = '';

    if (ownerProfileId) {
      params.push(ownerProfileId);
      ownerWhere = 'and owner_profile_id = $2';
    }

    const conversation = await this.db.query(
      `select id, blocked
       from conversations
       where id = $1
       ${ownerWhere}`,
      params,
    );

    if (!conversation.rows[0]) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.rows[0].blocked) {
      throw new BadRequestException('Conversation is blocked');
    }

    const result = await this.db.query(
      `insert into messages (conversation_id, sender, body)
       values ($1, $2, $3)
       returning *`,
      [conversationId, dto.sender, dto.body],
    );

    await this.db.query(
      `update conversations
       set updated_at = now()
       where id = $1`,
      [conversationId],
    );

    const message = result.rows[0];

    this.realtime.emitMessage({
      conversation_id: conversationId,
      message,
    });

    return message;
  }

  async setBlocked(conversationId: string, blocked: boolean, ownerProfileId?: string) {
    const params: unknown[] = [conversationId, blocked];
    let ownerWhere = '';

    if (ownerProfileId) {
      params.push(ownerProfileId);
      ownerWhere = 'and owner_profile_id = $3';
    }

    const result = await this.db.query(
      `update conversations
       set blocked = $2,
           blocked_at = case when $2 then now() else null end,
           updated_at = now()
       where id = $1
       ${ownerWhere}
       returning *`,
      params,
    );

    const conversation = result.rows[0];
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const fullConversation = await this.getConversation(conversationId, ownerProfileId);
    this.realtime.emitConversation(fullConversation);

    return fullConversation;
  }
}
