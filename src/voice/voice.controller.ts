import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Res,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VoiceService } from './voice.service';
import { UploadVoiceDto } from './dto/upload-voice.dto';

@ApiTags('voice')
@Controller('voice')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a voice file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Voice file (MP3, M4A, WAV, OGG)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Voice file uploaded successfully',
    type: UploadVoiceDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid file format or size' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadVoice(@UploadedFile() file: Express.Multer.File): Promise<UploadVoiceDto> {
    return this.voiceService.uploadVoice(file);
  }

  @Get(':filename')
  @ApiOperation({ summary: 'Get a voice file by filename' })
  @ApiParam({ name: 'filename', description: 'Voice file filename', example: '1729612345678-abc12345-voice.mp3' })
  @ApiResponse({
    status: 200,
    description: 'Voice file',
    content: {
      'audio/*': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Voice file not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getVoice(@Param('filename') filename: string, @Res() res: Response): Promise<void> {
    const filePath = await this.voiceService.getVoicePath(filename);
    res.sendFile(filePath);
  }

  @Delete(':filename')
  @ApiOperation({ summary: 'Delete a voice file' })
  @ApiParam({ name: 'filename', description: 'Voice file filename', example: '1729612345678-abc12345-voice.mp3' })
  @ApiResponse({ status: 200, description: 'Voice file deleted successfully' })
  @ApiResponse({ status: 404, description: 'Voice file not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteVoice(@Param('filename') filename: string): Promise<{ message: string }> {
    await this.voiceService.deleteVoice(filename);
    return { message: 'Voice file deleted successfully' };
  }
}

