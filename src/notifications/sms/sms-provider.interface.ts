export interface SmsSendResult {
  delivered: boolean;
  reason: string;
}

export interface SmsProvider {
  readonly name: string;
  readonly configured: boolean;
  send(mobile: string, message: string): Promise<SmsSendResult>;
}
