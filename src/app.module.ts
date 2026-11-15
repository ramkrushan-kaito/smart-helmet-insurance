import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { ClaimsModule } from './claims/claims.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './common/prisma.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { HealthModule } from './health/health.module';
import { HelmetsModule } from './helmets/helmets.module';
import { InsuranceProductsModule } from './insurance-products/insurance-products.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SmsModule } from './notifications/sms/sms.module';
import { PaymentsModule } from './payments/payments.module';
import { PoliciesModule } from './policies/policies.module';
import { QrCodesModule } from './qr-codes/qr-codes.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 300 }]),
    PrismaModule,
    SmsModule,
    AuditLogsModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    HelmetsModule,
    QrCodesModule,
    VehiclesModule,
    InsuranceProductsModule,
    PoliciesModule,
    ClaimsModule,
    PaymentsModule,
    NotificationsModule,
    DashboardModule,
    SettingsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
