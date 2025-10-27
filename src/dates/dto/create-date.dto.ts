import { IsString, IsDateString, IsArray, ValidateNested, MinLength, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { LocationDto } from './location.dto';
import { BudgetDto } from './budget.dto';

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

  @ApiProperty({ type: BudgetDto })
  @ValidateNested()
  @Type(() => BudgetDto)
  budgetAmount: BudgetDto;

  @ApiProperty({ minimum: 0, maximum: 100 })
  @IsNumber()
  @Min(0)
  @Max(100)
  costSplitPercentage: number;
}
