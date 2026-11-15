import { HelmetStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

export class CreateHelmetDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  brand: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  model: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  color: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10)
  size: string;

  @IsString()
  @MinLength(4)
  @MaxLength(60)
  serialNumber: string;

  @Type(() => Number)
  @IsInt()
  @Min(1990)
  @Max(2100)
  manufactureYear: number;

  @IsOptional()
  @IsBoolean()
  generateQr?: boolean;
}

export class UpdateHelmetDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  customerId?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  vehicleId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  size?: string;

  @IsOptional()
  @IsEnum(HelmetStatus)
  status?: HelmetStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1990)
  @Max(2100)
  manufactureYear?: number;
}

export class HelmetQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(HelmetStatus)
  status?: HelmetStatus;

  @IsOptional()
  @IsUUID()
  customerId?: string;
}
