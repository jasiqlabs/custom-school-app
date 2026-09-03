import { DocumentJobConsumer } from './consumers/platform-foundation/document-job.consumer';
import { ExportJobConsumer } from './consumers/platform-foundation/export-job.consumer';
import { DlqConsumer } from './consumers/platform-foundation/dlq.consumer';

export class WorkerApp {
  public documentConsumer: DocumentJobConsumer;
  public exportConsumer: ExportJobConsumer;
  public dlqConsumer: DlqConsumer;

  constructor(dbAdapter: any) {
    this.documentConsumer = new DocumentJobConsumer(dbAdapter);
    this.exportConsumer = new ExportJobConsumer(dbAdapter);
    this.dlqConsumer = new DlqConsumer();
  }

  start() {
    console.log('BullMQ worker listeners started for queues: document, export');
  }
}
