import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThemesModule } from './themes/themes.module';

@Module({
  imports: [ThemesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
