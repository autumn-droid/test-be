import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ThemesModule } from './themes/themes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        const password = configService.get<string>('CLOUD_MONGO_DB_PASSWORD');
        if (!password) {
          throw new Error('CLOUD_MONGO_DB_PASSWORD environment variable is not defined');
        }
        const encodedPassword = encodeURIComponent(password);
        return {
          uri: `mongodb+srv://thanhandp147:${encodedPassword}@datedi-cluster.cbqhp8m.mongodb.net/?retryWrites=true&w=majority&appName=Datedi-Cluster`,
        };
      },
      inject: [ConfigService],
    }),
    ThemesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
