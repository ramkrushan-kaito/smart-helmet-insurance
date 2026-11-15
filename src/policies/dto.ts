import { PolicyStatus, RenewalStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

export class CreatePolicyDto {
  @IsUUID()
  customerId: string;

  @IsUUID()
  vehicleId: string;

  @IsUUID()
  productId: string;

  @IsOptional()
  @IsUUID()
  helmetId?: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(PolicyStatus)
  status?: PolicyStatus;
}

export class UpdatePolicyDto {
  @IsOptional()
  @IsEnum(PolicyStatus)
  status?: PolicyStatus;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class PolicyQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PolicyStatus)
  status?: PolicyStatus;

  @IsOptional()
  @IsUUID()
  customerId?: string;
}

export class CreateRenewalDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  note: string;
}

export class UpdateRenewalDto {
  @IsEnum(RenewalStatus)
  status: RenewalStatus;
}
