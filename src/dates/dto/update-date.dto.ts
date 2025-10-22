import { PartialType } from '@nestjs/swagger';
import { CreateDateDto } from './create-date.dto';

export class UpdateDateDto extends PartialType(CreateDateDto) {}
