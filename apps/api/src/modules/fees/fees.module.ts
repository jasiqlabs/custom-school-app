import { Module } from '@nestjs/common';
import { FeesController } from './controllers/fees.controller';
import { FeesRepository } from './repository/fees.repository';
import { ReceiptNumberAllocator } from './domain/receipt-number-allocator';
import { ConfigureFeeService } from './application/configure-fee.service';
import { GenerateDuesService } from './application/generate-dues.service';
import { CollectPaymentService } from './application/collect-payment.service';
import { QueryPaymentsService } from './application/query-payments.service';
import { VoidPaymentService } from './application/void-payment.service';
import { QueryPendingFeesService } from './application/query-pending-fees.service';
import { FeeExportsService } from './application/fee-exports.service';
import { FeesPublicFacadeImpl } from './facade/fees-public.facade';
import { PlatformModule } from '../../platform/platform.module';

@Module({
  imports: [PlatformModule],
  controllers: [FeesController],
  providers: [
    FeesRepository,
    ReceiptNumberAllocator,
    ConfigureFeeService,
    GenerateDuesService,
    CollectPaymentService,
    QueryPaymentsService,
    VoidPaymentService,
    QueryPendingFeesService,
    FeeExportsService,
    FeesPublicFacadeImpl,
  ],
  exports: [
    FeesRepository,
    ConfigureFeeService,
    GenerateDuesService,
    CollectPaymentService,
    QueryPaymentsService,
    VoidPaymentService,
    QueryPendingFeesService,
    FeeExportsService,
    FeesPublicFacadeImpl,
  ],
})
export class FeesModule {}
