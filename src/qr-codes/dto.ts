import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { QrStatus } from '@prisma/client';

export class GenerateQrDto {
  @IsUUID()
  helmetId: string;

  @IsOptional()
  @IsBoolean()
  reissue?: boolean;
}

export class ScanQrDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  token: string;
}

export class ScanClaimDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  token: string;

  @IsDateString()
  incidentDate: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  claimAmount: number;
}

export class ScanBuyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  token: string;

  @IsOptional()
  @IsUUID()
  productId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(20)
  companyCode?: string;
}

export class UpdateQrStatusDto {
  @IsEnum(QrStatus)
  status: QrStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
