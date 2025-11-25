import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

// Performance test script
export async function runBatchAttemptsTest(app: INestApplication, token: string, examId: string) {
  const t0 = Date.now();
  const N = 100;
  const srv = app.getHttpServer();

  const jobs = Array.from({ length: N }, () =>
    request(srv).post('/attempts').set('Authorization', `Bearer ${token}`).send({ examId }),
  );

  const res = await Promise.allSettled(jobs);
  const t1 = Date.now();

  const successCount = res.filter((r) => r.status === 'fulfilled').length;
  const failedCount = res.filter((r) => r.status === 'rejected').length;

  console.log(`Attempts: ${N}`);
  console.log(`Time: ${t1 - t0}ms`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Avg time per request: ${(t1 - t0) / N}ms`);
}
