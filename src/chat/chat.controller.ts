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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto';
import { ChatGateway } from './chat.gateway';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private chatService: ChatService,
    private chatGateway: ChatGateway,
  ) {}

  @Get('conversations')
  async getUserConversations(@Request() req) {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    return this.chatService.getUserConversations(userId);
  }

  @Get('conversations/:conversationId/messages')
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

  @Post('conversations/:conversationId/messages')
  async sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() sendMessageDto: Omit<SendMessageDto, 'conversationId'>,
    @Request() req,
  ) {
    const userId: string = (req.user?._id ?? req.user?.id ?? req.user?.userId)?.toString();
    
    // Send message and save to database
    const message = await this.chatService.sendMessage(
      conversationId,
      userId,
      sendMessageDto.type,
      sendMessageDto.content,
      sendMessageDto.metadata,
    );

    // Broadcast to all participants in the conversation room via WebSocket
    this.chatGateway.emitToConversation(conversationId, 'message:new', message);

    return message;
  }

  @Post('system-messages')
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

