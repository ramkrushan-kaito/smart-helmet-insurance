import { ClaimStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

export class CreateClaimDto {
  @IsUUID()
  policyId: string;

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

export class UpdateClaimStatusDto {
  @IsEnum(ClaimStatus)
  status: ClaimStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  approvedAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}

export class ClaimQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ClaimStatus)
  status?: ClaimStatus;

  @IsOptional()
  @IsUUID()
  policyId?: string;
}
