import { ApiProperty } from '@nestjs/swagger';

export class UploadImageDto {
  @ApiProperty({
    description: 'The unique filename of the uploaded image',
    example: '1729612345678-abc123-avatar.png',
  })
  filename: string;

  @ApiProperty({
    description: 'Relative path for database storage',
    example: '/images/1729612345678-abc123-avatar.png',
  })
  path: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 45678,
  })
  size: number;

  @ApiProperty({
    description: 'MIME type of the image',
    example: 'image/png',
  })
  mimetype: string;

  @ApiProperty({
    description: 'Upload timestamp',
    example: '2024-10-20T10:30:00.000Z',
  })
  uploadedAt: string;
}
