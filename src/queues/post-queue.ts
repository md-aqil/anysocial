import { Queue } from 'bullmq';
import { redis } from '../db/redis.js';

const QUEUE_NAME = 'social-posting';
const RETRY_QUEUE_NAME = 'social-retries';
const DEAD_LETTER_QUEUE_NAME = 'dead-letter';

export interface PostJobData {
  postId: string;
  platform: string;
  userId: string;
  content: string;
  mediaUrls: string[];
  scheduledAt: string;
  attempt?: number;
}

export interface PostJobResult {
  success: boolean;
  platformPostId?: string;
  url?: string;
  error?: string;
  publishedAt?: string;
}

// Main posting queue
export const postQueue = new Queue(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 100,
    removeOnFail: false
  }
});

// Retry queue for failed jobs
export const retryQueue = new Queue(RETRY_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: 50,
    removeOnFail: false
  }
});

// Dead-letter queue for permanently failed jobs
export const deadLetterQueue = new Queue(DEAD_LETTER_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: false
  }
});

/**
 * Get queue statistics
 */
export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    postQueue.getWaitingCount(),
    postQueue.getActiveCount(),
    postQueue.getCompletedCount(),
    postQueue.getFailedCount(),
    postQueue.getDelayedCount()
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed
  };
}

/**
 * Gracefully shutdown queues
 */
export async function shutdownQueues() {
  await Promise.all([postQueue.close(), retryQueue.close(), deadLetterQueue.close()]);
}
