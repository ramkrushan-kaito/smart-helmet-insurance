import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(80)
  password: string;
}

export class RequestOtpDto {
  @IsString()
  @MaxLength(15)
  mobile: string;
}

export class VerifyOtpDto {
  @IsString()
  @MaxLength(15)
  mobile: string;

  @IsString()
  @MinLength(4)
  @MaxLength(8)
  otp: string;
}
