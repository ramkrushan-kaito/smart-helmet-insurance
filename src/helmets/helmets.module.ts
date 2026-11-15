import { Module } from '@nestjs/common';
import { QrCodesModule } from '../qr-codes/qr-codes.module';
import { HelmetsController } from './helmets.controller';
import { HelmetsService } from './helmets.service';

@Module({
  imports: [QrCodesModule],
  controllers: [HelmetsController],
  providers: [HelmetsService],
  exports: [HelmetsService],
})
export class HelmetsModule {}
