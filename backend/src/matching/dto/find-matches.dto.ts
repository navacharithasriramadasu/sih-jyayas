import { IsString, IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { QualityGrade } from '@prisma/client';

export class FindMatchesDto {
  @IsString()
  crop: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity_kg: number;

  @IsOptional()
  @IsEnum(QualityGrade)
  grade?: QualityGrade;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  max_distance_km?: number;

  @IsNumber()
  @Type(() => Number)
  lat: number;

  @IsNumber()
  @Type(() => Number)
  lng: number;
}
