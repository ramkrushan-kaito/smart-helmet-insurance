import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RoleName, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { AuditService } from '../audit-logs/audit.service';
import { PrismaService } from '../common/prisma.service';
import { userPublicSelect } from '../common/types';
import { SMS_PROVIDER } from '../notifications/sms/sms.module';
import { SmsProvider } from '../notifications/sms/sms-provider.interface';
import { AdminLoginDto, RequestOtpDto, VerifyOtpDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {}

  async requestOtp(dto: RequestOtpDto, ip?: string) {
    const mobile = dto.mobile.trim();
    const windowSeconds = Number(this.config.get('OTP_WINDOW_SECONDS') ?? 900);
    const maxRequests = Number(this.config.get('OTP_MAX_REQUESTS') ?? 5);
    const since = new Date(Date.now() - windowSeconds * 1000);
    const recent = await this.prisma.otpVerification.count({
      where: { mobile, createdAt: { gte: since } },
    });
    if (recent >= maxRequests) {
      throw new HttpException('Too many OTP requests. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.prisma.user.findFirst({
      where: { mobile, deletedAt: null, role: { name: RoleName.CUSTOMER } },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('This mobile number is not registered.');
    }

    const demo = this.config.get<string>('DEMO_OTP_ENABLED') === 'true';
    const code = demo ? this.config.get<string>('DEMO_OTP_CODE') || '123456' : this.randomCode();
    const expiresIn = Number(this.config.get('OTP_EXPIRY_SECONDS') ?? 300);
    await this.prisma.otpVerification.updateMany({
      where: { mobile, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await this.prisma.otpVerification.create({
      data: {
        mobile,
        codeHash: await bcrypt.hash(code, 10),
        purpose: 'LOGIN',
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });

    const sms = await this.sms.send(mobile, `Your Smart Helmet Insurance OTP is ${code}`);
    await this.audit.log({
      userId: user.id,
      action: 'OTP_REQUEST',
      entity: 'otp_verifications',
      ipAddress: ip,
      metadata: { smsSent: sms.delivered, provider: this.sms.name },
    });

    return {
      demoMode: demo,
      smsSent: sms.delivered,
      smsProvider: this.sms.name,
      expiresInSeconds: expiresIn,
      message: sms.delivered
        ? 'OTP sent.'
        : 'DEMO MODE: No SMS was sent. Use OTP 123456 to continue.',
      ...(demo && !sms.delivered ? { demoOtp: code } : {}),
    };
  }

  async verifyOtp(dto: VerifyOtpDto, ip?: string) {
    const mobile = dto.mobile.trim();
    const record = await this.prisma.otpVerification.findFirst({
      where: { mobile, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) throw new UnauthorizedException('OTP is invalid or was not requested.');
    if (record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('OTP has expired. Request a new OTP.');
    }
    if (record.attempts >= 5) {
      throw new BadRequestException('Too many invalid OTP attempts. Request a new OTP.');
    }
    const matches = await bcrypt.compare(dto.otp.trim(), record.codeHash);
    if (!matches) {
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('OTP is incorrect.');
    }

    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    const user = await this.prisma.user.findFirst({
      where: { mobile, deletedAt: null },
      include: { role: true, customer: true },
    });
    if (!user || user.role.name !== RoleName.CUSTOMER || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('This account cannot sign in with OTP.');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.log({
      userId: user.id,
      action: 'OTP_VERIFY',
      entity: 'users',
      entityId: user.id,
      ipAddress: ip,
    });
    return this.tokenResponse(user);
  }

  async adminLogin(dto: AdminLoginDto, ip?: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.trim().toLowerCase(), deletedAt: null },
      include: { role: true, customer: true },
    });
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid email or password.');
    if (user.role.name === RoleName.CUSTOMER) {
      throw new UnauthorizedException('Customers sign in with a mobile OTP.');
    }
    if (user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('This account is not active.');
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) throw new UnauthorizedException('Invalid email or password.');
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.log({
      userId: user.id,
      action: 'LOGIN',
      entity: 'users',
      entityId: user.id,
      ipAddress: ip,
    });
    return this.tokenResponse(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { ...userPublicSelect, customer: { select: { id: true, customerCode: true, fullName: true, mobile: true } } },
    });
    if (!user) throw new UnauthorizedException('Account not found.');
    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      fullName: user.fullName,
      status: user.status,
      role: user.role.name,
      customerId: user.customer?.id ?? null,
      customerCode: user.customer?.customerCode ?? null,
    };
  }

  private async tokenResponse(user: {
    id: string;
    email: string | null;
    mobile: string | null;
    fullName: string;
    role: { name: RoleName };
    customer: { id: string } | null;
  }) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role.name,
      customerId: user.customer?.id ?? null,
    });
    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        mobile: user.mobile,
        fullName: user.fullName,
        role: user.role.name,
        customerId: user.customer?.id ?? null,
      },
    };
  }

  private randomCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
}
