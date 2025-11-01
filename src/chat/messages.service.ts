import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { MessageLimit, MessageLimitDocument } from './schemas/message-limit.schema';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { MessageResponseDto } from './dto/message-response.dto';
import { ConversationsService } from './conversations.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(MessageLimit.name) private messageLimitModel: Model<MessageLimitDocument>,
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    private conversationsService: ConversationsService,
  ) {}

  async createMessage(
    conversationId: string,
    senderId: string | null,
    type: 'text' | 'image' | 'system',
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

  async validateAndSendMessage(
    conversationId: string,
    senderId: string,
    type: 'text' | 'image' | 'system',
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
    if (type !== 'system') {
      await this.incrementMessageCount(conversationId, senderId);
    }

    // Check if this is a message from the other participant (lifting the limit)
    // Only lift limit if it hasn't been lifted already
    if (type !== 'system') {
      const limit = await this.messageLimitModel.findOne({ conversationId }).exec();
      if (limit && !limit.limitLifted) {
        const conversation = await this.conversationModel.findById(conversationId).exec();
        if (conversation) {
          const isRequester = limit.requesterId.toString() === senderId;
          // If sender is NOT the requester (i.e., the date owner is responding), lift the limit
          if (!isRequester) {
            await this.liftMessageLimit(conversationId);
          }
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

