import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadVoiceDto } from './dto/upload-voice.dto';

@Injectable()
export class VoiceService {
  private readonly storagePath = path.join(process.cwd(), 'storage', 'voice');
  private readonly allowedMimeTypes = [
    'audio/mpeg', // MP3
    'audio/mp4', // M4A/AAC
    'audio/wav', // WAV
    'audio/ogg', // OGG/Opus
    'audio/x-m4a', // Alternative M4A
    'audio/aac', // AAC
  ];
  private readonly maxFileSize = 20 * 1024 * 1024; // 20MB

  constructor() {
    this.ensureStorageDirectory();
  }

  async uploadVoice(file: Express.Multer.File): Promise<UploadVoiceDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only MP3, M4A, WAV, and OGG audio files are allowed.',
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
    const fileExtension = path.extname(file.originalname) || this.getExtensionFromMimeType(file.mimetype);
    const filename = `${timestamp}-${uuid}${fileExtension}`;
    
    const filePath = path.join(this.storagePath, filename);

    try {
      // Save file to storage
      await fs.writeFile(filePath, file.buffer);

      const uploadedAt = new Date().toISOString();

      return {
        filename,
        path: `/voice/${filename}`,
        size: file.size,
        mimetype: file.mimetype,
        uploadedAt,
      };
    } catch (error) {
      throw new BadRequestException('Failed to save voice file');
    }
  }

  async getVoicePath(filename: string): Promise<string> {
    const filePath = path.join(this.storagePath, filename);

    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      throw new NotFoundException(`Voice file ${filename} not found`);
    }
  }

  async deleteVoice(filename: string): Promise<void> {
    const filePath = path.join(this.storagePath, filename);

    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        throw new NotFoundException(`Voice file ${filename} not found`);
      }
      throw new BadRequestException('Failed to delete voice file');
    }
  }

  private getExtensionFromMimeType(mimetype: string): string {
    const mimeToExt: Record<string, string> = {
      'audio/mpeg': '.mp3',
      'audio/mp4': '.m4a',
      'audio/x-m4a': '.m4a',
      'audio/aac': '.m4a',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
    };
    return mimeToExt[mimetype] || '.mp3';
  }

  private async ensureStorageDirectory(): Promise<void> {
    try {
      await fs.access(this.storagePath);
    } catch {
      await fs.mkdir(this.storagePath, { recursive: true });
    }
  }
}

