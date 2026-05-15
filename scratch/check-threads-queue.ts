import { Queue } from 'bullmq';
import { redis } from '../src/db/redis.js';

async function main() {
  const q = new Queue('social-posting', { connection: redis });
  const waiting = await q.getWaiting();
  const active = await q.getActive();
  const threadsWaiting = waiting.filter(j => j.data.platform === 'THREADS');
  const threadsActive = active.filter(j => j.data.platform === 'THREADS');
  console.log('Threads waiting:', threadsWaiting.length);
  console.log('Threads active:', threadsActive.length);
  if (threadsWaiting.length) console.log('First waiting job data:', threadsWaiting[0].data);
  if (threadsActive.length) console.log('First active job data:', threadsActive[0].data);
}

main().catch(console.error).finally(() => process.exit(0));
