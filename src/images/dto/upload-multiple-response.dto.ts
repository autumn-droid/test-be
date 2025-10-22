import { ApiProperty } from '@nestjs/swagger';
import { UploadImageDto } from './upload-image.dto';

export class FailedUploadDto {
  @ApiProperty({
    description: 'Original filename of the failed upload',
    example: 'invalid-file.txt',
  })
  filename: string;

  @ApiProperty({
    description: 'Error message explaining why the upload failed',
    example: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
  })
  error: string;
}

export class UploadMultipleResponseDto {
  @ApiProperty({
    description: 'Array of successfully uploaded images',
    type: [UploadImageDto],
  })
  uploadedImages: UploadImageDto[];

  @ApiProperty({
    description: 'Total number of successfully uploaded files',
    example: 2,
  })
  totalUploaded: number;

  @ApiProperty({
    description: 'Array of failed uploads with error details',
    type: [FailedUploadDto],
  })
  failedUploads: FailedUploadDto[];
}
