import { Queue } from 'bullmq';
import { redis } from '../src/db/redis.js';

async function main() {
  const q = new Queue('social-posting', { connection: redis });
  const failedList = await q.getFailed();
  
  for (const job of failedList) {
     if (job.data.platform === 'THREADS') {
        console.log(`THREADS Job ${job.id} failed with:`, job.failedReason);
     }
  }
}

main().catch(console.error).finally(() => process.exit(0));
