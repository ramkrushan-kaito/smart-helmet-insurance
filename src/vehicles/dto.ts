import { VehicleType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

export class CreateVehicleDto {
  @IsUUID()
  customerId: string;

  @IsString()
  @MinLength(4)
  @MaxLength(20)
  registrationNumber: string;

  @IsEnum(VehicleType)
  type: VehicleType;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  make: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  model: string;

  @Type(() => Number)
  @IsInt()
  @Min(1990)
  @Max(2100)
  year: number;

  @IsString()
  @MaxLength(40)
  color: string;

  @IsString()
  @MinLength(6)
  @MaxLength(40)
  chassisNumber: string;

  @IsString()
  @MinLength(4)
  @MaxLength(40)
  engineNumber: string;
}

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  registrationNumber?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  type?: VehicleType;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  make?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;
}

export class VehicleQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;
}
