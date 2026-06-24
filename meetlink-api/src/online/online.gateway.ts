import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import jwt from 'jsonwebtoken';
import { Server, Socket } from 'socket.io';
import { resolveJwtSecret } from '../auth/jwt-secret';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGIN ?? 'http://127.0.0.1:5173',
    credentials: true,
  },
})
export class OnlineGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly onlineUsers = new Map<string, string>();

  constructor(private readonly config: ConfigService) {}

  handleConnection(client: Socket) {
    // Join an authenticated per-profile room so realtime events can be targeted to the
    // actual participants instead of broadcast to everyone (data-isolation).
    const profileId = this.profileIdFromHandshake(client);
    if (profileId) client.join(`profile:${profileId}`);
    client.emit('online:count', this.onlineUsers.size);
  }

  handleDisconnect(client: Socket) {
    for (const [nickname, socketId] of this.onlineUsers.entries()) {
      if (socketId === client.id) {
        this.onlineUsers.delete(nickname);
        break;
      }
    }

    this.server.emit('online:count', this.onlineUsers.size);
  }

  @SubscribeMessage('online:join')
  join(@ConnectedSocket() client: Socket, @MessageBody() body: { nickname?: string }) {
    if (!body.nickname) {
      return { ok: false };
    }

    this.onlineUsers.set(body.nickname, client.id);
    this.server.emit('online:count', this.onlineUsers.size);

    return {
      ok: true,
      nickname: body.nickname,
    };
  }

  // Verify the JWT carried in the socket handshake and return its profileId (or null).
  private profileIdFromHandshake(client: Socket): string | null {
    const raw =
      (client.handshake?.auth as { token?: string } | undefined)?.token ||
      (typeof client.handshake?.headers?.authorization === 'string'
        ? client.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
        : '');
    if (!raw) return null;
    try {
      const payload = jwt.verify(raw, resolveJwtSecret(this.config));
      if (
        typeof payload !== 'string' &&
        (payload.role === 'admin' || payload.role === 'user') &&
        typeof payload.profileId === 'string'
      ) {
        return payload.profileId;
      }
    } catch {
      // invalid/expired token — socket stays unscoped (receives nothing private)
    }
    return null;
  }

  // Emit an event ONLY to the given participant profiles' rooms (never globally).
  private emitToProfiles(profileIds: Array<string | null | undefined>, event: string, payload: unknown) {
    const ids = [...new Set(profileIds.filter((id): id is string => typeof id === 'string' && id.length > 0))];
    if (!ids.length) return; // no known participant → emit to no one (fail closed)
    let target: any = this.server;
    for (const id of ids) target = target.to(`profile:${id}`);
    target.emit(event, payload);
  }

  emitConversation(conversation: Record<string, any>) {
    this.emitToProfiles(
      [conversation?.owner_profile_id, conversation?.guest_profile_id],
      'messages:conversation',
      conversation,
    );
  }

  emitMessage(payload: Record<string, any>) {
    this.emitToProfiles([payload?.owner_profile_id, payload?.guest_profile_id], 'messages:message', payload);
  }

  emitRequestResponse(payload: Record<string, any>) {
    // Only the request owner should hear about a new response.
    this.emitToProfiles([payload?.owner_profile_id], 'requests:response', payload);
  }

  emitStory(story: Record<string, any>) {
    // Stories are public discovery content (shown to nearby people) — broadcast is intended.
    this.server.emit('stories:new', story);
  }

  emitRead(payload: Record<string, any>) {
    this.emitToProfiles([payload?.owner_profile_id, payload?.guest_profile_id], 'messages:read', payload);
  }
}
