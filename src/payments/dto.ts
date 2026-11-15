import { PaymentPurpose, PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

export class CreatePaymentDto {
  @IsUUID()
  customerId: string;

  @IsOptional()
  @IsUUID()
  policyId?: string;

  @IsOptional()
  @IsUUID()
  claimId?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(PaymentPurpose)
  purpose: PaymentPurpose;

  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @IsString()
  @MaxLength(40)
  method: string;
}

export class PaymentQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;
}
