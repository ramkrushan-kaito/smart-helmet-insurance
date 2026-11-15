import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { RoleName, UserStatus } from '@prisma/client';

export class CreateStaffDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(80)
  password: string;

  @IsEnum(RoleName)
  role: RoleName;
}

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}
