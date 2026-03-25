import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger, Inject, forwardRef } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private readonly logger = new Logger(ChatGateway.name);

  afterInit(server: Server) {
    server.use(async (socket, next) => {
      try {
        const userId = await this.authenticateSocket(socket);
        socket.data.userId = userId;
        this.logger.debug(`Middleware auth success → client=${socket.id} user=${userId}`);
        next();
      } catch (error) {
        this.logger.warn(`Middleware auth failed → client=${socket.id} reason=${error.message}`);
        next(new Error('Authentication failed'));
      }
    });
  }

  async handleConnection(client: Socket) {
    const userId = client.data?.userId;
    this.logger.log(`Client connected: ${client.id}${userId ? ` user=${userId}` : ''}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:conversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = await this.authenticateSocket(client);

      // Verify user has access to conversation
      const conversation = await this.chatService.getConversationById(data.conversationId, userId);

      // Join the conversation room
      const room = `conversation:${data.conversationId}`;
      client.join(room);

      this.logger.log(`join:conversation → user=${userId} conversation=${data.conversationId}`);

      // Notify the user they've joined successfully
      client.emit('joined', { conversationId: data.conversationId });

      // Notify others in the room that this user joined (excluding the user who just joined)
      client.to(room).emit('user:joined', {
        conversationId: data.conversationId,
        userId,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.warn(`join:conversation failed → client=${client.id} reason=${error.message}`);
      client.emit('error', { message: error.message || 'Authentication failed' });
    }
  }

  @SubscribeMessage('leave:conversation')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = await this.authenticateSocket(client);
      const room = `conversation:${data.conversationId}`;

      // Notify others in the room that this user is leaving (before leaving the room)
      client.to(room).emit('user:left', {
        conversationId: data.conversationId,
        userId,
        timestamp: new Date().toISOString(),
      });

      client.leave(room);

      this.logger.log(`leave:conversation → user=${userId} conversation=${data.conversationId}`);
      client.emit('left', { conversationId: data.conversationId });
    } catch (error) {
      this.logger.warn(`leave:conversation failed → client=${client.id} reason=${error.message}`);
      client.emit('error', { message: error.message || 'Authentication failed' });
    }
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @MessageBody() sendMessageDto: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = await this.authenticateSocket(client);

      // Merge images array into metadata so multiple images can be sent with one message
      const mergedMetadata = {
        ...(sendMessageDto.metadata || {}),
        ...(sendMessageDto.images && sendMessageDto.images.length > 0 ? { images: sendMessageDto.images } : {}),
      };

      // Send message using the service
      const message = await this.chatService.sendMessage(
        sendMessageDto.conversationId,
        userId,
        sendMessageDto.type,
        sendMessageDto.content,
        mergedMetadata,
      );

      // Notify sender of successful delivery
      client.emit('message:sent', message);

      // Broadcast to other participants in the conversation room
      const room = `conversation:${sendMessageDto.conversationId}`;
      this.server.to(room).emit('message:new', message);

      this.logger.log(`message:send → user=${userId} conversation=${sendMessageDto.conversationId} type=${sendMessageDto.type}`);
    } catch (error) {
      // Send error back to sender
      client.emit('error', { 
        message: error.message || 'Failed to send message',
        type: error.name,
      });
      this.logger.error(`message:send failed → client=${client.id} reason=${error.message}`);
    }
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = await this.authenticateSocket(client);
      const room = `conversation:${data.conversationId}`;

      // Broadcast typing indicator to others in the room (excluding sender)
      client.to(room).emit('typing:start', {
        conversationId: data.conversationId,
        userId,
      });
      this.logger.debug(`typing:start → user=${userId} conversation=${data.conversationId}`);
    } catch (error) {
      this.logger.warn(`typing:start failed → client=${client.id} reason=${error.message}`);
      client.emit('error', { message: error.message || 'Authentication failed' });
    }
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = await this.authenticateSocket(client);
      const room = `conversation:${data.conversationId}`;

      // Broadcast typing stop indicator to others in the room (excluding sender)
      client.to(room).emit('typing:stop', {
        conversationId: data.conversationId,
        userId,
      });
      this.logger.debug(`typing:stop → user=${userId} conversation=${data.conversationId}`);
    } catch (error) {
      this.logger.warn(`typing:stop failed → client=${client.id} reason=${error.message}`);
      client.emit('error', { message: error.message || 'Authentication failed' });
    }
  }

  @SubscribeMessage('message:read')
  async handleMarkAsRead(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const userId = await this.authenticateSocket(client);

      await this.chatService.markAsRead(data.messageId, userId);
      this.logger.debug(`message:read → user=${userId} message=${data.messageId}`);
    } catch (error) {
      this.logger.warn(`message:read failed → client=${client.id} reason=${error.message}`);
      client.emit('error', { message: error.message || 'Failed to mark as read' });
    }
  }

  // Helper method to authenticate socket connection
  private async authenticateSocket(client: Socket): Promise<string> {
    try {
      if (client.data?.userId) {
        return client.data.userId as string;
      }
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        throw new Error('No token provided');
      }

      const secret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key';
      const payload = await this.jwtService.verifyAsync(token, { secret });
      client.data.userId = payload.sub;
      this.logger.debug(`Authenticated socket → client=${client.id} user=${payload.sub}`);
      
      return payload.sub;
    } catch (error) {
      this.logger.warn(`Socket authentication failed → client=${client.id} reason=${error.message}`);
      throw new Error('Invalid token');
    }
  }

  // Helper method to emit to all participants in a conversation
  emitToConversation(conversationId: string, event: string, data: any) {
    const room = `conversation:${conversationId}`;
    this.logger.debug(`emitToConversation → room=${room} event=${event}`);
    this.server.to(room).emit(event, data);
  }
}

