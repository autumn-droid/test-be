import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadImageDto } from './dto/upload-image.dto';
import { UploadMultipleResponseDto } from './dto/upload-multiple-response.dto';

@Injectable()
export class ImagesService {
  private readonly storagePath = path.join(process.cwd(), 'storage', 'images');
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB

  constructor() {
    this.ensureStorageDirectory();
  }

  async uploadImage(file: Express.Multer.File): Promise<UploadImageDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
      );
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds limit. Maximum allowed size is ${this.maxFileSize / (1024 * 1024)}MB`,
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const uuid = uuidv4().substring(0, 8);
    const fileExtension = path.extname(file.originalname);
    const filename = `${timestamp}-${uuid}${fileExtension}`;
    
    const filePath = path.join(this.storagePath, filename);

    try {
      // Save file to storage
      await fs.writeFile(filePath, file.buffer);

      const uploadedAt = new Date().toISOString();

      return {
        filename,
        path: `/images/${filename}`,
        size: file.size,
        mimetype: file.mimetype,
        uploadedAt,
      };
    } catch (error) {
      throw new BadRequestException('Failed to save image file');
    }
  }

  async uploadMultipleImages(files: Express.Multer.File[]): Promise<UploadMultipleResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const uploadedImages: UploadImageDto[] = [];
    const failedUploads: { filename: string; error: string }[] = [];

    // Process each file
    for (const file of files) {
      try {
        const result = await this.uploadImage(file);
        uploadedImages.push(result);
      } catch (error) {
        failedUploads.push({
          filename: file.originalname || 'unknown',
          error: error.message || 'Upload failed',
        });
      }
    }

    return {
      uploadedImages,
      totalUploaded: uploadedImages.length,
      failedUploads,
    };
  }

  async getImagePath(filename: string): Promise<string> {
    const filePath = path.join(this.storagePath, filename);

    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      throw new NotFoundException(`Image ${filename} not found`);
    }
  }

  async deleteImage(filename: string): Promise<void> {
    const filePath = path.join(this.storagePath, filename);

    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new NotFoundException(`Image ${filename} not found`);
      }
      throw new BadRequestException('Failed to delete image');
    }
  }

  async listImages(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.storagePath);
      return files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
      });
    } catch {
      return [];
    }
  }

  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.access(this.storagePath);
    } catch {
      await fs.mkdir(this.storagePath, { recursive: true });
    }
  }
}
