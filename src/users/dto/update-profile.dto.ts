import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({
    description: 'User full name',
    example: 'John Doe Smith',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Fullname must be at least 6 characters long' })
  fullname?: string;
}
