import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider, SmsSendResult } from './sms-provider.interface';

@Injectable()
export class DemoSmsProvider implements SmsProvider {
  readonly name = 'none';
  readonly configured = false;
  private readonly logger = new Logger(DemoSmsProvider.name);

  async send(mobile: string): Promise<SmsSendResult> {
    this.logger.log(`DEMO MODE: SMS provider is not configured. No message was sent to ${mobile}.`);
    return { delivered: false, reason: 'No SMS provider is configured.' };
  }
}

export class UnconfiguredSmsProvider implements SmsProvider {
  readonly configured = false;
  private readonly logger = new Logger(UnconfiguredSmsProvider.name);

  constructor(readonly name: string) {}

  async send(mobile: string): Promise<SmsSendResult> {
    this.logger.warn(`SMS provider "${this.name}" has no credentials. No message was sent to ${mobile}.`);
    return { delivered: false, reason: `SMS provider ${this.name} is not configured.` };
  }
}
