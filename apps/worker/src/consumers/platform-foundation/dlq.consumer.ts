export class DlqConsumer {
  async handleDeadLetter(queueName: string, jobData: any, failedReason: string): Promise<void> {
    console.error(`[DLQ] Job failed in queue ${queueName}:`, {
      jobData,
      failedReason,
      timestamp: new Date().toISOString(),
    });
  }
}
