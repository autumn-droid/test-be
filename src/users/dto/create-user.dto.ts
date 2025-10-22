import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nation code for phone number',
    example: '+84',
  })
  @IsString()
  @IsNotEmpty()
  nationCode: string;

  @ApiProperty({
    description: 'Phone number without nation code',
    example: '961096963',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'password123',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({
    description: 'User full name (minimum 6 characters)',
    example: 'John Doe Smith',
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  fullname: string;
}
