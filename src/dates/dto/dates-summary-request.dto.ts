import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsISO8601 } from 'class-validator';

export class DatesSummaryRequestDto {
  @ApiProperty({ type: [String], example: ["2025-10-30T15:30:00.000Z", "2025-10-30T16:30:00.000Z"] })
  @IsArray()
  @ArrayNotEmpty()
  @IsISO8601({}, { each: true })
  dates: string[];
}


