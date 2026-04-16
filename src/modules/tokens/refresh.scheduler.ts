import { redis } from '../../db/redis.js';
import { logger } from '../../logger/pino.js';
import { oauthService } from '../oauth/oauth.service.js';

const RETRY_KEY = 'refresh_retry_count';
const MAX_RETRIES = 5;

export class RefreshScheduler {
  private intervalId: NodeJS.Timeout | null = null;

  async processQueue(): Promise<void> {
    const now = Date.now();

    // Get tokens due for refresh (score <= now)
    const accounts = await redis.zrangebyscore(
      'token_refresh_queue',
      0,
      now
    );

    if (accounts.length === 0) {
      return;
    }

    logger.info({
      event: 'processing_refresh_queue',
      count: accounts.length
    });

    for (const accountId of accounts) {
      try {
        await oauthService.refreshToken(accountId);

        // Remove from queue on success
        await redis.zrem('token_refresh_queue', accountId);

        // Clear retry count
        await redis.hdel(RETRY_KEY, accountId);

        logger.info({
          event: 'token_refreshed_success',
          accountId
        });
      } catch (error: any) {
        logger.error({
          event: 'refresh_failed',
          accountId,
          error: error.message
        });

        // Increment retry count
        const retries = await this.incrementRetry(accountId);

        if (retries >= MAX_RETRIES) {
          // Mark as ERROR after max retries
          await redis.hdel(RETRY_KEY, accountId);
          await redis.zrem('token_refresh_queue', accountId);

          logger.error({
            event: 'max_retries_exceeded',
            accountId,
            retries
          });
        } else {
          // Exponential backoff: 1min, 2min, 4min, 8min, 16min
          const backoffSeconds = Math.pow(2, retries - 1) * 60;
          const nextRetry = now + backoffSeconds * 1000;

          await redis.zadd('token_refresh_queue', nextRetry, accountId);

          logger.info({
            event: 'retry_scheduled',
            accountId,
            retries,
            nextRetryAt: new Date(nextRetry).toISOString()
          });
        }
      }
    }
  }

  private async incrementRetry(accountId: string): Promise<number> {
    const count = await redis.hincrby(RETRY_KEY, accountId, 1);
    return count;
  }

  start(): void {
    if (this.intervalId) {
      return;
    }

    logger.info({ event: 'refresh_scheduler_started' });

    this.intervalId = setInterval(() => {
      this.processQueue().catch((error) => {
        logger.error({
          event: 'scheduler_error',
          error: error.message
        });
      });
    }, 60000); // Run every 60 seconds

    // Unref to prevent keeping process alive
    this.intervalId.unref();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info({ event: 'refresh_scheduler_stopped' });
    }
  }
}

export const refreshScheduler = new RefreshScheduler();
