import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DatesController } from './dates.controller';
import { JoinRequestsController } from './join-requests.controller';
import { DatesService } from './dates.service';
import { JoinRequestsService } from './join-requests.service';
import { DateEntity, DateSchema } from './schemas/date.schema';
import { JoinRequest, JoinRequestSchema } from './schemas/join-request.schema';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DateEntity.name, schema: DateSchema },
      { name: JoinRequest.name, schema: JoinRequestSchema },
    ]),
    AuthModule,
  ],
  controllers: [DatesController, JoinRequestsController],
  providers: [DatesService, JoinRequestsService],
  exports: [DatesService, JoinRequestsService],
})
export class DatesModule {}
