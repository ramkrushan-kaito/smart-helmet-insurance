import { IsDateString, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName: string;

  @Matches(/^[6-9][0-9]{9}$/, { message: 'Enter a 10-digit mobile number.' })
  mobile: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'Enter a 6-digit PIN code.' })
  pincode?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}

export class UpdateCustomerDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName?: string;

  @IsOptional()
  @Matches(/^[6-9][0-9]{9}$/, { message: 'Enter a 10-digit mobile number.' })
  mobile?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  state?: string;

  @IsOptional()
  @Matches(/^[1-9][0-9]{5}$/)
  pincode?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
