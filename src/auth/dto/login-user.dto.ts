import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginUserDto {
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
    description: 'User password',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
