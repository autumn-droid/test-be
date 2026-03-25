import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { SendMessageBodyDto } from './dto/send-message-body.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { ChatGateway } from './chat.gateway';
import { MessageLimitResponseDto } from './dto/message-limit-response.dto';
import { ConversationResponseDto } from './dto/conversation-response.dto';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatGateway: ChatGateway,
  ) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserConversations(@Request() req) {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    return this.chatService.getUserConversations(userId);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get messages for a conversation' })
  @ApiResponse({ status: 200, description: 'List of messages' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query() query: GetMessagesQueryDto,
    @Request() req,
  ) {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    return this.chatService.getMessages(
      conversationId,
      userId,
      query.page,
      query.limit,
    );
  }

  @Get('conversations/:conversationId/limit')
  @ApiOperation({ summary: 'Get message limit status for a conversation' })
  @ApiResponse({ status: 200, description: 'Message limit status', type: MessageLimitResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessageLimit(
    @Param('conversationId') conversationId: string,
    @Request() req,
  ) {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    return this.chatService.getMessageLimitStatus(conversationId, userId);
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: 'Get conversation by ID' })
  @ApiParam({ name: 'conversationId', description: 'Conversation ID' })
  @ApiResponse({ status: 200, description: 'Conversation details', type: ConversationResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversationById(
    @Param('conversationId') conversationId: string,
    @Request() req,
  ) {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    return this.chatService.getConversationByIdFormatted(conversationId, userId);
  }

  @Post('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Send a message to a conversation' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - message limit exceeded or validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - not a participant' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() sendMessageDto: SendMessageBodyDto,
    @Request() req,
  ) {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    
    const mergedMetadata = {
      ...(sendMessageDto.metadata || {}),
      ...(sendMessageDto.images && sendMessageDto.images.length > 0 ? { images: sendMessageDto.images } : {}),
    };

    // Send message and save to database
    const message = await this.chatService.sendMessage(
      conversationId,
      userId,
      sendMessageDto.type,
      sendMessageDto.content,
      mergedMetadata,
    );

    // Broadcast to all participants in the conversation room via WebSocket
    this.chatGateway.emitToConversation(conversationId, 'message:new', message);

    return message;
  }

  @Post('system-messages')
  @ApiOperation({ summary: 'Send a system message to a conversation' })
  @ApiResponse({ status: 201, description: 'System message sent successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async sendSystemMessage(
    @Body() body: { conversationId: string; content: string; metadata?: Record<string, any> },
    @Request() req,
  ) {
    // Note: In production, you might want to add admin-only guards or other restrictions
    const message = await this.chatService.sendSystemMessage(
      body.conversationId,
      body.content,
      body.metadata,
    );

    // Broadcast system message to all participants in the conversation room via WebSocket
    this.chatGateway.emitToConversation(body.conversationId, 'message:new', message);

    return message;
  }
}

