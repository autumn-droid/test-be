import { ApiProperty } from '@nestjs/swagger';

export class UploadVoiceDto {
  @ApiProperty({
    description: 'The unique filename of the uploaded voice file',
    example: '1729612345678-abc12345-voice.mp3',
  })
  filename: string;

  @ApiProperty({
    description: 'Relative path for database storage',
    example: '/voice/1729612345678-abc12345-voice.mp3',
  })
  path: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1234567,
  })
  size: number;

  @ApiProperty({
    description: 'MIME type of the audio file',
    example: 'audio/mpeg',
  })
  mimetype: string;

  @ApiProperty({
    description: 'Upload timestamp',
    example: '2024-10-20T10:30:00.000Z',
  })
  uploadedAt: string;
}

