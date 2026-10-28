import { Module } from '@nestjs/common';
import { PlatformModule } from '../../platform/platform.module';
import { FeesModule } from '../fees/fees.module';
import { ExamContextsService } from './application/exam-contexts.service';
import { AdmitCardsService } from './application/admit-cards.service';
import { OperatorExamsController } from './controllers/operator-exams.controller';
import { OperatorAdmitCardsController } from './controllers/operator-admit-cards.controller';

@Module({
  imports: [PlatformModule, FeesModule],
  controllers: [OperatorExamsController, OperatorAdmitCardsController],
  providers: [ExamContextsService, AdmitCardsService],
  exports: [ExamContextsService, AdmitCardsService],
})
export class ExaminationModule {}

