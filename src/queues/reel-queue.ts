import { Queue } from 'bullmq';
import { redis } from '../db/redis.js';

const QUEUE_NAME = 'reel-generation';

// Queue for generating reels
export const reelGenerationQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

// Helper to add a job to generate a reel
export async function queueReelGeneration(reelId: string, seriesId: string) {
  return reelGenerationQueue.add(
    'generate-reel',
    { reelId, seriesId },
    {
      jobId: `reel-${reelId}`,
    }
  );
}
