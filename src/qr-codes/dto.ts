import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNumber, Matches, Max, ValidateNested, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
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

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export const NOMINEE_RELATIONS = ['Spouse', 'Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Other'] as const;

export class PolicyHolderDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName: string;

  @IsDateString()
  dob: string;

  @Transform(trim)
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  address: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/\s+/g, '') : value))
  @Matches(/^[2-9][0-9]{11}$/, { message: 'Aadhaar number must be 12 digits.' })
  aadhaar: string;
}

export class NomineeDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  age: number;

  @IsIn(NOMINEE_RELATIONS)
  relationship: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  share: number;
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

  @IsOptional()
  @IsIn(['UPI', 'CARD', 'NETBANKING'])
  paymentMethod?: 'UPI' | 'CARD' | 'NETBANKING';

  @IsOptional()
  @ValidateNested()
  @Type(() => PolicyHolderDto)
  holder?: PolicyHolderDto;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => NomineeDto)
  nominees?: NomineeDto[];
}

export class UpdateQrStatusDto {
  @IsEnum(QrStatus)
  status: QrStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
