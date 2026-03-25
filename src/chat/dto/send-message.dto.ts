import { IsString, IsEnum, IsOptional, IsObject, IsArray, ArrayNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ description: 'Conversation ID to send the message to' })
  @IsString()
  conversationId: string;

  @ApiProperty({ enum: ['text', 'image', 'system', 'voice'], description: 'Message type' })
  @IsEnum(['text', 'image', 'system', 'voice'])
  type: 'text' | 'image' | 'system' | 'voice';

  @ApiProperty({ description: 'Message content. For image messages, can be a caption.' })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    type: 'object',
    description: 'Additional metadata for the message',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    type: [String],
    description: 'Array of image URLs to include in the message',
    example: ['https://cdn.example.com/img1.jpg', 'https://cdn.example.com/img2.jpg'],
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  images?: string[];
}

