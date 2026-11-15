import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
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

export class UpdateQrStatusDto {
  @IsEnum(QrStatus)
  status: QrStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
