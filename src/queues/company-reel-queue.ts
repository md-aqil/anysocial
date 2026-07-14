import { Queue } from 'bullmq';
import { redis } from '../db/redis.js';

const QUEUE_NAME = 'company-reel-generation';

// Queue for generating B2B company reels
export const companyReelQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

// Helper to enqueue a company reel generation job
export async function queueCompanyReelGeneration(kbId: string, companyReelId: string) {
  return companyReelQueue.add(
    'generate-company-reel',
    { kbId, companyReelId },
    {
      jobId: `company-reel-${companyReelId}`,
    }
  );
}
