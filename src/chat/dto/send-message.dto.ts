import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export class SendMessageDto {
  @IsString()
  conversationId: string;

  @IsEnum(['text', 'image', 'system'])
  type: 'text' | 'image' | 'system';

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

