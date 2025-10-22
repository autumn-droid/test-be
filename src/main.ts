import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Log MongoDB connection status
  console.log('Connecting to MongoDB Atlas...');
  console.log('MongoDB URI configured for:', 'datedi-cluster.cbqhp8m.mongodb.net');

  const config = new DocumentBuilder()
    .setTitle('Theme Management API')
    .setDescription('API for managing mobile app themes with version control')
    .setVersion('1.0')
    .addTag('themes')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation available at: http://localhost:${port}/api`);
}
bootstrap();
