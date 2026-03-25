import { OmitType } from '@nestjs/swagger';
import { SendMessageDto } from './send-message.dto';

export class SendMessageBodyDto extends OmitType(SendMessageDto, ['conversationId'] as const) {}


