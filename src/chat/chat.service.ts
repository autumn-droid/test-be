import { Injectable } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './messages.service';

@Injectable()
export class ChatService {
  constructor(
    private conversationsService: ConversationsService,
    private messagesService: MessagesService,
  ) {}

  async findOrCreateConversation(user1Id: string, user2Id: string) {
    return this.conversationsService.findOrCreateConversation(user1Id, user2Id);
  }

  async getConversationById(conversationId: string, userId: string) {
    return this.conversationsService.getConversationById(conversationId, userId);
  }

  async getUserConversations(userId: string) {
    return this.conversationsService.getUserConversations(userId);
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    type: 'text' | 'image' | 'system',
    content: string,
    metadata?: Record<string, any>,
  ) {
    return this.messagesService.validateAndSendMessage(
      conversationId,
      senderId,
      type,
      content,
      metadata,
    );
  }

  async getMessages(conversationId: string, userId: string, page?: number, limit?: number) {
    return this.messagesService.getMessages(conversationId, userId, page, limit);
  }

  async markAsRead(messageId: string, userId: string) {
    return this.messagesService.markAsRead(messageId, userId);
  }

  async initializeMessageLimit(conversationId: string, requesterId: string) {
    return this.messagesService.initializeMessageLimit(conversationId, requesterId);
  }

  async sendSystemMessage(
    conversationId: string,
    content: string,
    metadata?: Record<string, any>,
  ) {
    return this.messagesService.createMessage(
      conversationId,
      null,
      'system',
      content,
      metadata,
    );
  }
}

