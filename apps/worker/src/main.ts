import { WorkerApp } from './worker.module';

async function bootstrap() {
  const dummyDb = {
    findJobById: async () => null,
    updateJobStatus: async () => {},
    createSchoolFile: async () => {},
  };
  const app = new WorkerApp(dummyDb);
  app.start();
}

if (require.main === module) {
  bootstrap();
}
