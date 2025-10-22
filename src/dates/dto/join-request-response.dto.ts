import { ApiProperty } from '@nestjs/swagger';

export class JoinRequestResponseDto {
  @ApiProperty({ description: 'Unique identifier for the join request' })
  id: string;

  @ApiProperty({ description: 'Date information' })
  date: {
    id: string;
    startDateTime: string;
    greetingNote: string;
  };

  @ApiProperty({ description: 'Requester user information' })
  requester: {
    id: string;
    fullname: string;
    avatarUrl?: string;
  };

  @ApiProperty({ description: 'Message to the date owner' })
  message: string;

  @ApiProperty({ description: 'Current status of the request', enum: ['pending', 'accepted', 'rejected'] })
  status: 'pending' | 'accepted' | 'rejected';

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}
