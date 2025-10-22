import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJoinRequestDto {
  @ApiProperty({ description: 'Message to the date owner' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  message: string;
}
