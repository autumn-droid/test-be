import { ApiProperty } from '@nestjs/swagger';
import { LocationDto } from './location.dto';

export class DateResponseDto {
  @ApiProperty({ description: 'Unique identifier for the date' })
  id: string;

  @ApiProperty({ description: 'Owner user information' })
  owner: {
    id: string;
    fullname: string;
    avatarUrl?: string;
  };

  @ApiProperty({ description: 'Start date and time for the date' })
  startDateTime: string;

  @ApiProperty({ description: 'Greeting note or message for the date' })
  greetingNote: string;

  @ApiProperty({ description: 'List of locations for the date', type: [LocationDto] })
  locations: LocationDto[];

  @ApiProperty({ description: 'Current status of the date', enum: ['open', 'matched'] })
  status: 'open' | 'matched';

  @ApiProperty({ description: 'Number of pending join requests' })
  pendingRequestsCount: number;

  @ApiProperty()
  budgetAmount: {
    amount: number;
    currency: string;
  };

  @ApiProperty({ minimum: 0, maximum: 100 })
  costSplitPercentage: number;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}
