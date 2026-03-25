import { Injectable, Inject, forwardRef, OnModuleInit } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './messages.service';
import { MessageLimitResponseDto } from './dto/message-limit-response.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService implements OnModuleInit {
  constructor(
    private conversationsService: ConversationsService,
    private messagesService: MessagesService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) {}

  onModuleInit() {
    // Set up the emitter callback to avoid circular dependency
    this.messagesService.setLimitUpdateEmitter((conversationId: string) => 
      this.emitLimitUpdate(conversationId)
    );
  }

  private async emitLimitUpdate(conversationId: string): Promise<void> {
    if (!this.chatGateway) {
      return;
    }

    // Get conversation with participants
    const conversationDoc = await this.conversationsService.getConversationWithParticipants(conversationId);
    
    // Emit limit status for each participant
    for (const participant of conversationDoc.participants) {
      // Handle both populated and non-populated participants
      const userId = typeof participant === 'object' && participant._id 
        ? participant._id.toString() 
        : participant.toString();
      
      const limitStatus = await this.messagesService.getLimitStatusForEmission(conversationId, userId);
      
      // Emit to the conversation room with user-specific status
      this.chatGateway.emitToConversation(conversationId, 'limit:updated', limitStatus);
      console.log(`Emitted limit:updated for conversation=${conversationId} user=${userId} hasLimit=${limitStatus.hasLimit} limitLifted=${limitStatus.limitLifted}`);
    }
  }

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
    type: 'text' | 'image' | 'system' | 'voice',
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

  async getMessageLimitStatus(conversationId: string, userId: string): Promise<MessageLimitResponseDto> {
    return this.messagesService.getMessageLimitStatus(conversationId, userId);
  }

  async getConversationByIdFormatted(conversationId: string, userId: string): Promise<ConversationResponseDto> {
    return this.conversationsService.getConversationByIdFormatted(conversationId, userId);
  }
}

