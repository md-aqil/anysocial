import { Queue } from 'bullmq';
import { redis } from '../src/db/redis.js';

async function main() {
  const q = new Queue('social-posting', { connection: redis });
  const d = new Queue('dead-letter', { connection: redis });
  
  const waiting = await q.getWaiting();
  const active = await q.getActive();
  const failed = await q.getFailed();
  
  console.log('Posting Queue:');
  console.log('- Waiting:', waiting.length);
  console.log('- Active:', active.length);
  console.log('- Failed:', failed.length);
  if (failed.length > 0) {
    console.log('Last failed error:', failed[0].failedReason);
  }

  const dlWaiting = await d.getWaiting();
  console.log('Dead Letter Queue:', dlWaiting.length);
}

main().catch(console.error).finally(() => process.exit(0));
