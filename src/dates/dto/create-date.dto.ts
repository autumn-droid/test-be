import { IsString, IsDateString, IsArray, ValidateNested, MinLength, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LocationDto } from './location.dto';

export class CreateDateDto {
  @ApiProperty({ description: 'Start date and time for the date' })
  @IsDateString()
  startDateTime: string;

  @ApiProperty({ description: 'Greeting note or message for the date' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  greetingNote: string;

  @ApiProperty({ 
    description: 'List of locations for the date', 
    type: [LocationDto] 
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  locations: LocationDto[];
}
