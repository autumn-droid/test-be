import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { ConversationResponseDto } from './dto/conversation-response.dto';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
  ) {}

  async findOrCreateConversation(user1Id: string, user2Id: string): Promise<ConversationDocument> {
    // Convert to ObjectId and sort to ensure consistent lookup
    const id1 = new Types.ObjectId(user1Id);
    const id2 = new Types.ObjectId(user2Id);
    
    // Sort IDs to ensure consistent lookup
    const participantIds = [id1, id2].sort((a, b) => a.toString().localeCompare(b.toString()));
    console.log('findOrCreateConversation - participantIds:', participantIds.map(p => p.toString()));
    
    let conversation = await this.conversationModel.findOne({
      participants: participantIds,
    }).exec();

    if (!conversation) {
      console.log('Creating NEW conversation');
      conversation = new this.conversationModel({
        participants: participantIds,
      });
      await conversation.save();
      console.log('Created conversation ID:', (conversation._id as any).toString());
    } else {
      console.log('Found EXISTING conversation ID:', (conversation._id as any).toString());
    }

    return conversation;
  }

  async getConversationById(conversationId: string, userId: string): Promise<ConversationDocument> {
    const conversation = await this.conversationModel.findById(conversationId).exec();
    
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant
    const userObjectId = new Types.ObjectId(userId);
    const isParticipant = conversation.participants.some(
      p => p.toString() === userObjectId.toString()
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant of this conversation');
    }

    return conversation;
  }

  async getUserConversations(userId: string): Promise<ConversationResponseDto[]> {
    // Convert userId to ObjectId for proper query
    const userObjectId = new Types.ObjectId(userId);
    
    const conversations = await this.conversationModel
      .find({ participants: userObjectId })
      .populate('participants', 'fullname avatarUrl')
      .sort({ updatedAt: -1 })
      .exec();

    return conversations.map(conv => this.formatConversationResponse(conv));
  }

  async getConversationWithParticipants(conversationId: string): Promise<ConversationDocument> {
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate('participants', 'fullname avatarUrl')
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return conversation;
  }

  async getConversationByIdFormatted(conversationId: string, userId: string): Promise<ConversationResponseDto> {
    // Verify user has access to conversation
    await this.getConversationById(conversationId, userId);

    // Get conversation with populated participants
    const conversation = await this.conversationModel
      .findById(conversationId)
      .populate('participants', 'fullname avatarUrl')
      .exec();

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.formatConversationResponse(conversation);
  }

  private formatConversationResponse(conversation: ConversationDocument): ConversationResponseDto {
    const participantsAny: any = conversation.participants as any;
    
    // Handle both populated and non-populated participants
    const participants = Array.isArray(participantsAny) 
      ? participantsAny.map((p: any) => {
          // If populated (has _id and fullname), use those
          if (p._id && p.fullname) {
            return {
              id: p._id.toString(),
              fullname: p.fullname,
              avatarUrl: p.avatarUrl,
            };
          }
          // If not populated (just ObjectId), return basic info
          return {
            id: p.toString(),
            fullname: '',
            avatarUrl: undefined,
          };
        })
      : [];

    return {
      id: (conversation._id as any).toString(),
      participants,
      createdAt: (conversation.createdAt as Date).toISOString(),
      updatedAt: (conversation.updatedAt as Date).toISOString(),
    };
  }
}

