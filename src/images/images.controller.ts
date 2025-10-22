import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Res,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ImagesService } from './images.service';
import { UploadImageDto } from './dto/upload-image.dto';
import { UploadMultipleResponseDto } from './dto/upload-multiple-response.dto';

@ApiTags('images')
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a single image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, GIF, WebP)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    type: UploadImageDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file format or size' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File): Promise<UploadImageDto> {
    return this.imagesService.uploadImage(file);
  }

  @Post('upload-multiple')
  @ApiOperation({ summary: 'Upload multiple images' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Multiple image files (JPEG, PNG, GIF, WebP)',
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Images uploaded successfully',
    type: UploadMultipleResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file format or size' })
  @UseInterceptors(FilesInterceptor('files', 10)) // Allow up to 10 files
  async uploadMultipleImages(@UploadedFiles() files: Express.Multer.File[]): Promise<UploadMultipleResponseDto> {
    return this.imagesService.uploadMultipleImages(files);
  }

  @Get(':filename')
  @ApiOperation({ summary: 'Get an image by filename' })
  @ApiParam({ name: 'filename', description: 'Image filename', example: '1729612345678-abc123-avatar.png' })
  @ApiResponse({
    status: 200,
    description: 'Image file',
    content: {
      'image/*': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async getImage(@Param('filename') filename: string, @Res() res: Response): Promise<void> {
    const filePath = await this.imagesService.getImagePath(filename);
    res.sendFile(filePath);
  }

  @Get()
  @ApiOperation({ summary: 'List all uploaded images' })
  @ApiResponse({
    status: 200,
    description: 'List of image filenames',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  async listImages(): Promise<string[]> {
    return this.imagesService.listImages();
  }

  @Delete(':filename')
  @ApiOperation({ summary: 'Delete an image' })
  @ApiParam({ name: 'filename', description: 'Image filename', example: '1729612345678-abc123-avatar.png' })
  @ApiResponse({ status: 200, description: 'Image deleted successfully' })
  @ApiResponse({ status: 404, description: 'Image not found' })
  async deleteImage(@Param('filename') filename: string): Promise<{ message: string }> {
    await this.imagesService.deleteImage(filename);
    return { message: 'Image deleted successfully' };
  }
}
