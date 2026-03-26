import { ApiProperty } from '@nestjs/swagger';
import { DateResponseDto } from './date-response.dto';

export class NearbyDateResponseDto extends DateResponseDto {
  @ApiProperty({ description: 'Distance in kilometers from the provided coordinates to the nearest location of this date' })
  distanceKm: number;
}
