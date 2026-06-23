import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

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

  handleConnection(client: Socket) {
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

  emitConversation(conversation: Record<string, any>) {
    this.server.emit('messages:conversation', conversation);
  }

  emitMessage(payload: Record<string, any>) {
    this.server.emit('messages:message', payload);
  }

  emitRequestResponse(payload: Record<string, any>) {
    this.server.emit('requests:response', payload);
  }
}
