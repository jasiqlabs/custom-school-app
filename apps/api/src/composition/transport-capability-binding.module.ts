import { Global, Module } from '@nestjs/common';
import { TRANSPORT_PUBLIC_FACADE } from '../modules/students/ports/transport.port';
import { TransportsPublicFacadeImpl } from '../modules/transports/facade/transports-public.facade';
import { TransportsModule } from '../modules/transports/transports.module';

@Global()
@Module({
  imports: [TransportsModule],
  providers: [
    {
      provide: TRANSPORT_PUBLIC_FACADE,
      useClass: TransportsPublicFacadeImpl,
    },
  ],
  exports: [TRANSPORT_PUBLIC_FACADE],
})
export class TransportCapabilityBindingModule {}
