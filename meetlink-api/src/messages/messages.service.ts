import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { DbService } from '../db/db.service';
import { OnlineGateway } from '../online/online.gateway';
import { ProfilesService } from '../profiles/profiles.service';
import { SendMessageDto, StartConversationDto } from './dto';

// Cap the client-supplied reply-story metadata and NEVER persist a base64 image (only an
// http(s) URL) so it can't re-bloat the DB. `mine` is derived per-viewer on the client.
export function sanitizeReplyStory(rs: unknown): Record<string, unknown> | null {
  if (!rs || typeof rs !== 'object') return null;
  const r = rs as Record<string, any>;
  const image = typeof r.image === 'string' && /^https?:\/\//i.test(r.image) ? r.image.slice(0, 600) : null;
  const out = {
    name: String(r.name ?? '').slice(0, 80),
    snippet: String(r.snippet ?? '').slice(0, 300),
    gradient: String(r.gradient ?? '').slice(0, 200),
    image,
  };
  if (!out.name && !out.snippet && !out.image) return null;
  return out;
}

@Injectable()
export class MessagesService {
  constructor(
    private readonly db: DbService,
    private readonly profiles: ProfilesService,
    private readonly realtime: OnlineGateway,
  ) {}

  // Find the real account a guest name refers to (so the recipient sees the chat too).
  // Match ONLY on the unique `nickname` (never the non-unique display `name`) and refuse
  // to link on an ambiguous result — otherwise a stranger whose display name collides with
  // a guest alias would silently become a participant in someone else's chat.
  private async resolveGuestProfile(name: string, excludeOwnerId: string) {
    const result = await this.db.query<{ id: string }>(
      `select id from profiles
       where id <> $2 and lower(nickname) = lower($1)`,
      [name, excludeOwnerId],
    );
    return result.rows.length === 1 ? result.rows[0] : null;
  }

  // trustedGuestProfileId comes ONLY from a server-verified actor (e.g. the authenticated
  // responder in requests.service). Never accept a guest profile id from the client body.
  async startConversation(dto: StartConversationDto, ownerProfileId?: string, trustedGuestProfileId?: string) {
    const owner = ownerProfileId
      ? await this.profiles.findById(ownerProfileId)
      : dto.ownerNickname
      ? await this.profiles.findByNickname(dto.ownerNickname)
      : await this.profiles.findAdminProfile();
    const guestNickname = dto.guestNickname?.trim() || `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
    // Prefer the explicit, server-verified linked profile; never link the chat to the owner
    // themselves. Otherwise fall back to a UNIQUE nickname match.
    const explicitGuestId =
      trustedGuestProfileId && trustedGuestProfileId !== owner.id ? trustedGuestProfileId : null;
    const guestProfile = explicitGuestId
      ? { id: explicitGuestId }
      : await this.resolveGuestProfile(guestNickname, owner.id);

    const conversationResult = await this.db.query(
      `insert into conversations (owner_profile_id, guest_nickname, guest_profile_id, contact, source, updated_at)
       values ($1, $2, $3, $4, $5, now())
       on conflict (owner_profile_id, guest_nickname) do update
       set contact = coalesce(excluded.contact, conversations.contact),
           guest_profile_id = coalesce(excluded.guest_profile_id, conversations.guest_profile_id),
           source = excluded.source,
           updated_at = now()
       returning *`,
      [owner.id, guestNickname, guestProfile?.id ?? null, dto.contact ?? null, dto.source ?? 'chat'],
    );

    const conversation = conversationResult.rows[0];
    // Scope the internal first-message insert to the owner (trusted) rather than fail-open.
    await this.addMessage(
      conversation.id,
      { sender: dto.sender ?? 'guest', body: dto.body, replyStory: dto.replyStory },
      owner.id,
    );

    // Broadcast + return a fully-joined conversation so BOTH clients can render names.
    const full = await this.getConversation(conversation.id);
    this.realtime.emitConversation(full);

    return full;
  }

  async listConversations(viewerProfileId?: string) {
    // A viewer profile is REQUIRED. Without it we must NOT fall through to an unscoped
    // query that returns every account's conversations — return nothing instead.
    if (!viewerProfileId) return [];
    const params: unknown[] = [viewerProfileId];
    // The viewer may be the owner OR the linked recipient.
    const where = 'where (c.owner_profile_id = $1 or c.guest_profile_id = $1)';

    const result = await this.db.query(
      `select
         c.*,
         op.nickname as owner_nickname,
         op.name as owner_name,
         op.status as owner_status,
         op.avatar_url as owner_avatar,
         gp.name as guest_name,
         gp.status as guest_status,
         gp.avatar_url as guest_avatar,
         last_message.body as last_message,
         last_message.sender as last_sender,
         last_message.created_at as last_message_at,
         coalesce(message_counts.total, 0)::int as message_count
       from conversations c
       join profiles op on op.id = c.owner_profile_id
       left join profiles gp on gp.id = c.guest_profile_id
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

  async getConversation(id: string, viewerProfileId?: string) {
    const params: unknown[] = [id];
    let viewerWhere = '';

    if (viewerProfileId) {
      params.push(viewerProfileId);
      viewerWhere = 'and (c.owner_profile_id = $2 or c.guest_profile_id = $2)';
    }

    const conversationResult = await this.db.query(
      `select c.*, op.nickname as owner_nickname, op.name as owner_name, op.status as owner_status,
              op.avatar_url as owner_avatar, gp.name as guest_name, gp.status as guest_status,
              gp.avatar_url as guest_avatar
       from conversations c
       join profiles op on op.id = c.owner_profile_id
       left join profiles gp on gp.id = c.guest_profile_id
       where c.id = $1
       ${viewerWhere}`,
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

  // The counterpart's full profile INCLUDING contacts — only for a verified participant of
  // the conversation (being in a chat = you've connected, so contacts are shared). Strangers
  // hitting the public /profiles/:nickname still get the contacts-free projection.
  async getCounterpartProfile(conversationId: string, viewerProfileId?: string) {
    if (!viewerProfileId) throw new UnauthorizedException('A user profile is required');
    // getConversation with a viewer enforces that the caller is owner OR guest.
    const conversation = (await this.getConversation(conversationId, viewerProfileId)) as Record<string, any>;
    const counterpartId =
      conversation.owner_profile_id === viewerProfileId
        ? conversation.guest_profile_id
        : conversation.owner_profile_id;
    if (!counterpartId) {
      throw new NotFoundException('This person has no profile');
    }
    const p = await this.profiles.findById(counterpartId);
    return {
      nickname: p.nickname,
      name: p.name,
      age: p.age,
      city: p.city,
      area: p.area,
      bio: p.bio,
      interests: p.interests,
      avatar_url: p.avatar_url,
      status: p.status,
      instagram: p.instagram,
      telegram: p.telegram,
      phone: p.phone,
    };
  }

  async addMessage(conversationId: string, dto: SendMessageDto, ownerProfileId?: string) {
    const params: unknown[] = [conversationId];
    let viewerWhere = '';

    if (ownerProfileId) {
      params.push(ownerProfileId);
      viewerWhere = 'and (owner_profile_id = $2 or guest_profile_id = $2)';
    }

    const conversation = await this.db.query(
      `select id, blocked, owner_profile_id, guest_profile_id
       from conversations
       where id = $1
       ${viewerWhere}`,
      params,
    );

    if (!conversation.rows[0]) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.rows[0].blocked) {
      throw new BadRequestException('Conversation is blocked');
    }

    const replyStory = sanitizeReplyStory(dto.replyStory);
    const result = await this.db.query(
      `insert into messages (conversation_id, sender, body, reply_story)
       values ($1, $2, $3, $4::jsonb)
       returning *`,
      [conversationId, dto.sender, dto.body, replyStory ? JSON.stringify(replyStory) : null],
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
      owner_profile_id: conversation.rows[0].owner_profile_id,
      guest_profile_id: conversation.rows[0].guest_profile_id,
      message,
    });

    return message;
  }

  // Mark the conversation read for whichever side the viewer is on.
  async markRead(conversationId: string, viewerProfileId?: string) {
    if (viewerProfileId) {
      await this.db.query(
        `update conversations
         set owner_last_read_at = case when owner_profile_id = $2 then now() else owner_last_read_at end,
             guest_last_read_at = case when guest_profile_id = $2 then now() else guest_last_read_at end
         where id = $1 and (owner_profile_id = $2 or guest_profile_id = $2)`,
        [conversationId, viewerProfileId],
      );
    }
    const conversation = await this.getConversation(conversationId, viewerProfileId);
    if (viewerProfileId && conversation) {
      // Tell the other side their messages were seen (live "Seen" status) — scoped to the two.
      const conv = conversation as Record<string, any>;
      this.realtime.emitRead({
        conversation_id: conversationId,
        owner_profile_id: conv.owner_profile_id,
        guest_profile_id: conv.guest_profile_id,
        side: conv.owner_profile_id === viewerProfileId ? 'owner' : 'guest',
      });
    }
    return conversation;
  }

  async setBlocked(conversationId: string, blocked: boolean, ownerProfileId?: string) {
    const params: unknown[] = [conversationId, blocked];
    let viewerWhere = '';

    if (ownerProfileId) {
      params.push(ownerProfileId);
      viewerWhere = 'and (owner_profile_id = $3 or guest_profile_id = $3)';
    }

    const result = await this.db.query(
      `update conversations
       set blocked = $2,
           blocked_at = case when $2 then now() else null end,
           updated_at = now()
       where id = $1
       ${viewerWhere}
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
