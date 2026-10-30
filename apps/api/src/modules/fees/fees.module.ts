import { OpeningBalancesController } from './controllers/opening-balances.controller';
import { OpeningBalanceImportService } from './application/opening-balance-import.service';
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

import { FeeCategoriesRulesService } from './application/fee-categories-rules.service';

@Module({
  imports: [PlatformModule],
  controllers: [FeesController, OpeningBalancesController],
  providers: [
    FeesRepository,
    OpeningBalanceImportService,
    ReceiptNumberAllocator,
    ConfigureFeeService,
    FeeCategoriesRulesService,
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
    FeeCategoriesRulesService,
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
