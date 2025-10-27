import { IsNumber, IsString, Min, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BudgetDto {
  @ApiProperty({ description: 'Budget amount', minimum: 0 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: 'Currency code', enum: ['VND', 'USD', 'EUR', 'JPY', 'GBP', 'CNY'] })
  @IsString()
  @IsIn(['VND', 'USD', 'EUR', 'JPY', 'GBP', 'CNY'])
  currency: string;
}
