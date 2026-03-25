import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

@Module({
  imports: [
    MulterModule.register({
      storage: require('multer').memoryStorage(),
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB limit
      },
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'audio/mpeg', // MP3
          'audio/mp4', // M4A/AAC
          'audio/wav', // WAV
          'audio/ogg', // OGG/Opus
          'audio/x-m4a', // Alternative M4A
          'audio/aac', // AAC
        ];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new Error('Invalid file type. Only MP3, M4A, WAV, and OGG audio files are allowed.'), false);
        }
      },
    }),
  ],
  controllers: [VoiceController],
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}

