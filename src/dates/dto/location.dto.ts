import { IsString, IsNumber, IsDateString, IsArray, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LocationDto {
  @ApiProperty({ description: 'Name of the location' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Latitude coordinate', minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate', minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiProperty({ description: 'Scheduled visit time for this location' })
  @IsDateString()
  visitTime: string;

  @ApiProperty({ description: 'Array of image URLs for this location', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imageUrls?: string[];
}
