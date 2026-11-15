import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DemoSmsProvider, UnconfiguredSmsProvider } from './demo-sms.provider';
import { SmsProvider } from './sms-provider.interface';

export const SMS_PROVIDER = 'SMS_PROVIDER';

@Global()
@Module({
  providers: [
    DemoSmsProvider,
    {
      provide: SMS_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): SmsProvider => {
        const name = config.get<string>('SMS_PROVIDER', 'none');
        if (!name || name === 'none') return new DemoSmsProvider();
        return new UnconfiguredSmsProvider(name);
      },
    },
  ],
  exports: [SMS_PROVIDER],
})
export class SmsModule {}
