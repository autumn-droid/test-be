import { ApiProperty } from '@nestjs/swagger';

export class ThemeVersionDto {
  @ApiProperty({ example: '1', description: 'Theme version number' })
  version: string;

  @ApiProperty({ example: '2025-10-14T00:00:00Z', description: 'Release date' })
  releaseDate: string;

  @ApiProperty({ example: 1024000, description: 'File size in bytes' })
  size: number;

  @ApiProperty({ example: 'Initial theme release', description: 'Changelog' })
  changelog?: string;
}

export class UploadThemeDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Theme zip file' })
  file: Express.Multer.File;

  @ApiProperty({ example: 'Updated icons and colors', description: 'Changelog for this version', required: false })
  changelog?: string;
}

