import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { MessageLimit, MessageLimitDocument } from './schemas/message-limit.schema';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { MessageResponseDto } from './dto/message-response.dto';
import { MessageLimitResponseDto } from './dto/message-limit-response.dto';
import { ConversationsService } from './conversations.service';

@Injectable()
export class MessagesService {
  private limitUpdateEmitter?: (conversationId: string) => Promise<void>;

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(MessageLimit.name) private messageLimitModel: Model<MessageLimitDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    private conversationsService: ConversationsService,
  ) {}

  // Method to set the emitter callback (called by ChatService after initialization)
  setLimitUpdateEmitter(emitter: (conversationId: string) => Promise<void>) {
    this.limitUpdateEmitter = emitter;
  }

  async createMessage(
    conversationId: string,
    senderId: string | null,
    type: 'text' | 'image' | 'system' | 'voice',
    content: string,
    metadata?: Record<string, any>,
  ): Promise<MessageResponseDto> {
    const conversation = await this.conversationModel.findById(conversationId).exec();
    
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // For non-system messages, verify sender is participant
    if (type !== 'system' && senderId) {
      const isParticipant = conversation.participants.some(
        p => p.toString() === senderId
      );
      if (!isParticipant) {
        throw new ForbiddenException('You are not a participant of this conversation');
      }
    }

    const message = new this.messageModel({
      conversationId,
      senderId: type === 'system' ? null : senderId,
      type,
      content,
      metadata: metadata || {},
    });

    const savedMessage = await message.save();

    // Update conversation's updatedAt timestamp
    await this.conversationModel.findByIdAndUpdate(conversationId, { updatedAt: new Date() }).exec();

    return this.formatMessageResponse(savedMessage);
  }

  async getMessages(
    conversationId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ messages: MessageResponseDto[]; total: number; page: number; totalPages: number }> {
    // Verify user has access to conversation
    await this.conversationsService.getConversationById(conversationId, userId);

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.messageModel
        .find({ conversationId })
        .populate('senderId', 'fullname avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments({ conversationId }).exec(),
    ]);

    // Reverse to get chronological order (oldest first)
    const reversedMessages = messages.reverse();

    return {
      messages: reversedMessages.map(msg => this.formatMessageResponse(msg)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markAsRead(messageId: string, userId: string): Promise<void> {
    const message = await this.messageModel.findById(messageId).exec();
    
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user has access to conversation
    await this.conversationsService.getConversationById(message.conversationId.toString(), userId);

    // Add user to readBy if not already present
    if (!message.readBy.some(id => id.toString() === userId)) {
      message.readBy.push(userId as any);
      await message.save();
    }
  }

  async checkMessageLimit(conversationId: string, senderId: string): Promise<boolean> {
    const limit = await this.messageLimitModel.findOne({ conversationId }).exec();
    
    // No limit exists or limit is lifted
    if (!limit || limit.limitLifted) {
      return true;
    }

    // Limit only applies to the original requester
    if (limit.requesterId.toString() !== senderId) {
      return true;
    }

    // Check if message count is below 5
    return limit.messageCount < 5;
  }

  async incrementMessageCount(conversationId: string, senderId: string): Promise<void> {
    await this.messageLimitModel.updateOne(
      { conversationId, requesterId: senderId },
      { $inc: { messageCount: 1 } }
    ).exec();
  }

  async liftMessageLimit(conversationId: string): Promise<void> {
    await this.messageLimitModel.updateOne(
      { conversationId },
      { limitLifted: true }
    ).exec();

    // Emit event to all participants that the limit has been lifted
    if (this.limitUpdateEmitter) {
      await this.limitUpdateEmitter(conversationId);
    }
  }

  async emitLimitUpdate(conversationId: string): Promise<void> {
    if (!this.limitUpdateEmitter) {
      return;
    }

    await this.limitUpdateEmitter(conversationId);
  }

  async getLimitStatusForEmission(conversationId: string, userId: string): Promise<MessageLimitResponseDto & { conversationId: string; userId: string }> {
    const limitStatus = await this.getMessageLimitStatus(conversationId, userId);
    return {
      conversationId,
      userId,
      ...limitStatus,
    };
  }

  async initializeMessageLimit(conversationId: string, requesterId: string): Promise<void> {
    console.log('initializeMessageLimit - conversationId:', conversationId, 'requesterId:', requesterId);
    
    // Check if limit already exists
    const existing = await this.messageLimitModel.findOne({ conversationId }).exec();
    console.log('existing limit:', existing ? 'FOUND' : 'NOT FOUND');
    
    if (!existing) {
      console.log('Creating new message limit');
      const messageLimit = new this.messageLimitModel({
        conversationId,
        requesterId,
        messageCount: 0,
        limitLifted: false,
      });
      await messageLimit.save();
      console.log('Created message limit ID:', (messageLimit._id as any).toString());
    } else {
      console.log('Message limit already exists, skipping creation');
    }
  }

  async getMessageLimitStatus(conversationId: string, userId: string): Promise<MessageLimitResponseDto> {
    // Verify user has access to conversation
    await this.conversationsService.getConversationById(conversationId, userId);

    const limit = await this.messageLimitModel.findOne({ conversationId }).exec();

    // If no limit exists, user can send unlimited messages
    if (!limit) {
      return {
        hasLimit: false,
        isRequester: false,
        messageCount: 0,
        remainingMessages: null, // null means unlimited
        limitLifted: true,
        canSendMessage: true,
      };
    }

    const isRequester = limit.requesterId.toString() === userId;
    const limitLifted = limit.limitLifted;
    const messageCount = limit.messageCount;
    
    // If limit is lifted, user can send unlimited messages
    if (limitLifted) {
      return {
        hasLimit: false,
        isRequester,
        messageCount,
        remainingMessages: null, // null means unlimited
        limitLifted: true,
        canSendMessage: true,
      };
    }

    // If user is not the requester, they can send unlimited messages
    if (!isRequester) {
      return {
        hasLimit: false,
        isRequester: false,
        messageCount: 0,
        remainingMessages: null, // null means unlimited
        limitLifted: false,
        canSendMessage: true,
      };
    }

    // User is requester and limit is active
    const remainingMessages = Math.max(0, 5 - messageCount);
    const canSendMessage = messageCount < 5;

    return {
      hasLimit: true,
      isRequester: true,
      messageCount,
      remainingMessages,
      limitLifted: false,
      canSendMessage,
    };
  }

  async validateAndSendMessage(
    conversationId: string,
    senderId: string,
    type: 'text' | 'image' | 'system' | 'voice',
    content: string,
    metadata?: Record<string, any>,
  ): Promise<MessageResponseDto> {
    // For non-system messages, check message limit
    if (type !== 'system') {
      const canSend = await this.checkMessageLimit(conversationId, senderId);
      
      if (!canSend) {
        throw new BadRequestException('You have reached the maximum number of messages. Please wait for a response.');
      }
    }

    // Create the message
    const message = await this.createMessage(conversationId, senderId, type, content, metadata);

    // Increment message count for non-system messages
    let limitWasLifted = false;
    if (type !== 'system') {
      await this.incrementMessageCount(conversationId, senderId);

      // Check if this is a message from the other participant (lifting the limit)
      // Only lift limit if it hasn't been lifted already
      const limit = await this.messageLimitModel.findOne({ conversationId }).exec();
      if (limit && !limit.limitLifted) {
        const conversation = await this.conversationModel.findById(conversationId).exec();
        if (conversation) {
          const isRequester = limit.requesterId.toString() === senderId;
          // If sender is NOT the requester (i.e., the date owner is responding), lift the limit
          if (!isRequester) {
            await this.liftMessageLimit(conversationId);
            limitWasLifted = true;
          }
        }
      }

      // Emit limit update event if message count changed (for requester to see remaining messages)
      if (!limitWasLifted && limit && limit.requesterId.toString() === senderId) {
        // Emit update for all participants
        if (this.limitUpdateEmitter) {
          await this.limitUpdateEmitter(conversationId);
        }
      }
    }

    return message;
  }

  private formatMessageResponse(message: MessageDocument): MessageResponseDto {
    const senderAny: any = message.senderId;
    const sender = senderAny
      ? {
          id: senderAny._id?.toString() || senderAny.toString(),
          fullname: senderAny.fullname || '',
          avatarUrl: senderAny.avatarUrl,
        }
      : null;

    return {
      id: (message._id as any).toString(),
      conversationId: (message.conversationId as any).toString(),
      sender,
      type: message.type,
      content: message.content,
      metadata: message.metadata,
      readBy: message.readBy.map(id => (id as any).toString()),
      createdAt: (message.createdAt as Date).toISOString(),
      updatedAt: (message.updatedAt as Date).toISOString(),
    };
  }
}

