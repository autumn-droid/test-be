import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ChatGateway } from './chat.gateway';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ConversationsService } from './conversations.service';
import { MessagesService } from './messages.service';
import { Conversation, ConversationSchema } from './schemas/conversation.schema';
import { Message, MessageSchema } from './schemas/message.schema';
import { MessageLimit, MessageLimitSchema } from './schemas/message-limit.schema';
import { DatesModule } from '../dates/dates.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
      { name: Message.name, schema: MessageSchema },
      { name: MessageLimit.name, schema: MessageLimitSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => DatesModule),
    AuthModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ConversationsService, MessagesService, ChatGateway],
  exports: [ChatService, ConversationsService, MessagesService],
})
export class ChatModule {}

