import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  _id: string;

  @ApiProperty({
    description: 'Nation code for phone number',
    example: '+84',
  })
  nationCode: string;

  @ApiProperty({
    description: 'Phone number without nation code',
    example: '961096963',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe Smith',
  })
  fullname: string;

  @ApiProperty({
    description: 'User avatar image URL',
    example: '/images/1761104953641-7b3b9693.jpg',
    required: false,
  })
  avatarUrl?: string;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}
