import { Module } from '@nestjs/common';
import { InsuranceProductsController } from './insurance-products.controller';
import { InsuranceProductsService } from './insurance-products.service';

@Module({
  controllers: [InsuranceProductsController],
  providers: [InsuranceProductsService],
})
export class InsuranceProductsModule {}
