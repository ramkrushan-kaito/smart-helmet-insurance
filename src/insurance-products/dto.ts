import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  code: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  coverageAmount: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  premiumAmount: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMonths: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  coverageAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  premiumAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  durationMonths?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
