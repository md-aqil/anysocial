import { Worker, Job } from 'bullmq';
import { redis } from '../db/redis.js';
import { prisma } from '../db/prisma.js';
import { deadLetterQueue, type PostJobData, type PostJobResult } from '../queues/post-queue.js';
import { instagramAdapter } from '../adapters/instagram.adapter.js';
import { facebookAdapter } from '../adapters/facebook.adapter.js';
import { twitterAdapter } from '../adapters/twitter.adapter.js';
import { linkedinAdapter } from '../adapters/linkedin.adapter.js';
import { youtubeAdapter } from '../adapters/youtube.adapter.js';
import { threadsAdapter } from '../adapters/threads.adapter.js';
import { pinterestAdapter } from '../adapters/pinterest.adapter.js';
import { snapchatAdapter } from '../adapters/snapchat.adapter.js';
import { logger } from '../logger/pino.js';
import { tokenCrypto } from '../crypto/token-crypto.service.js';
import { oauthService } from '../modules/oauth/oauth.service.js';

export class PostWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'social-posting',
      this.processJob.bind(this),
      {
        connection: redis,
        concurrency: 2, // Reduced from 5 to 2 to prevent rapid bursts
        limiter: {
          max: 3,
          duration: 1000 // Only 3 jobs per second globally
        }
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Process a single posting job
   */
  private async processJob(job: Job<PostJobData>): Promise<PostJobResult> {
    const { postId, platform, userId, content, mediaUrls } = job.data;

    logger.info({
      event: 'job_started',
      jobId: job.id,
      postId,
      platform,
      userId,
      attempt: job.attemptsMade + 1
    });

    // 0. Humanized Jitter: Add a random delay (5-15 seconds) to avoid "bot-like" behavior
    const jitterMs = Math.floor(Math.random() * 10000) + 5000;
    logger.info({ event: 'human_jitter_delay', ms: jitterMs, postId });
    await new Promise(resolve => setTimeout(resolve, jitterMs));

    try {
      // 1. Fetch post from database
      const post = await prisma.post.findUnique({
        where: { id: postId }
      });

      if (!post) {
        throw new Error(`Post ${postId} not found`);
      }

      // 2. Fetch OAuth tokens for this platform
      let socialAccount = await prisma.socialAccount.findFirst({
        where: {
          userId,
          platform: platform.toUpperCase() as any,
          status: 'CONNECTED'
        }
      });

      if (!socialAccount) {
        throw new Error(`No connected ${platform} account found`);
      }

      // Proactively refresh token if expired or expiring in the next 5 minutes
      const now = new Date();
      const expiresAt = socialAccount.tokenExpiry ? new Date(socialAccount.tokenExpiry) : null;
      const isExpiredOrExpiringSoon = !expiresAt || expiresAt.getTime() < (now.getTime() + 5 * 60 * 1000);

      if (isExpiredOrExpiringSoon && socialAccount.refreshToken) {
        logger.info({ event: 'proactive_token_refresh', platform, accountId: socialAccount.id });
        try {
          await oauthService.refreshToken(socialAccount.id);
          // Re-fetch with new token
          socialAccount = await prisma.socialAccount.findUnique({ where: { id: socialAccount.id } }) ?? socialAccount;
        } catch (refreshErr: any) {
          logger.warn({ event: 'proactive_refresh_failed', platform, error: refreshErr.message });
          // Continue with the existing token — the adapter will handle 401 on retry
        }
      }

      // Decrypt access token
      const encryptedToken = JSON.parse(socialAccount.accessToken);
      const accessToken = tokenCrypto.decrypt(encryptedToken);

      // 3. Prepare platform-specific payload
      const adapter = this.getAdapter(platform);
      
      const customOptions = post.platformOptions ? (post.platformOptions as any)[platform] : {};
      const platformContent = customOptions.content || content;
      
      const payload = adapter.prepareContent(platformContent, platform);
      payload.mediaUrls = adapter.formatMediaUrls(mediaUrls, platform);


      payload.platformSpecificFields = {
        accessToken,
        pageId: socialAccount.externalAccountId,
        accountId: socialAccount.id,
        userId,
        ...customOptions
      };

      // 4. Validate payload
      const validation = adapter.validatePayload(payload);
      if (!validation.valid) {
        throw new Error(`Payload validation failed: ${validation.errors.join(', ')}`);
      }

      // 5. Publish to platform
      const result = await adapter.publish(socialAccount.externalAccountId, payload);

      if (!result.success) {
        throw new Error(result.error);
      }

      // 6. Update post status in database
      await this.updatePlatformResult(postId, platform, {
        success: true,
        platformPostId: result.platformPostId,
        url: result.url,
        error: null,
        publishedAt: new Date().toISOString()
      });

      logger.info({
        event: 'job_completed',
        jobId: job.id,
        postId,
        platform,
        platformPostId: result.platformPostId
      });

      return {
        success: true,
        platformPostId: result.platformPostId,
        url: result.url,
        publishedAt: new Date().toISOString()
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error({
        event: 'job_failed',
        jobId: job.id,
        postId,
        platform,
        error: errorMessage,
        attempt: job.attemptsMade + 1
      });

      // SAFETY KILL-SWITCH: Detect Meta/Platform Spam & Restriction Errors
      const isPolicyViolation = 
        errorMessage.toLowerCase().includes('spam') || 
        errorMessage.toLowerCase().includes('restricted') ||
        errorMessage.toLowerCase().includes('policy') ||
        errorMessage.toLowerCase().includes('inauthentic') ||
        errorMessage.includes('368'); // Facebook/Instagram error code for "Action Blocked"

      if (isPolicyViolation) {
        logger.warn({
          event: 'policy_killswitch_triggered',
          platform,
          postId,
          error: errorMessage
        });

        // Automatically disable the account to prevent further escalation/ban
        await prisma.socialAccount.updateMany({
          where: {
            userId,
            platform: platform.toUpperCase() as any,
            status: 'CONNECTED'
          },
          data: {
            status: 'ERROR',
            metadata: {
              restrictionReason: 'AUTOMATED_LOCK_POLICY_VIOLATION',
              lastErrorMessage: errorMessage,
              lockedAt: new Date().toISOString()
            }
          }
        });
      }

      // Update platform result with error
      await this.updatePlatformResult(postId, platform, {
        success: false,
        platformPostId: null,
        url: null,
        error: isPolicyViolation ? `ACCOUNT_LOCKED: ${errorMessage}` : errorMessage,
        publishedAt: null
      });

      // If it's a policy violation, don't retry from the queue anymore
      if (isPolicyViolation) {
        return { success: false, error: 'Account locked due to policy violation' } as any;
      }

      throw error; // Re-throw to trigger BullMQ retry for normal network/timeout errors
    }
  }

  /**
   * Get appropriate adapter for platform
   */
  private getAdapter(platform: string) {
    const adapters: Record<string, any> = {
      INSTAGRAM: instagramAdapter,
      FACEBOOK: facebookAdapter,
      TWITTER: twitterAdapter,
      LINKEDIN: linkedinAdapter,
      YOUTUBE: youtubeAdapter,
      THREADS: threadsAdapter,
      PINTEREST: pinterestAdapter,
      SNAPCHAT: snapchatAdapter
    };

    const adapter = adapters[platform.toUpperCase()];
    if (!adapter) {
      throw new Error(`No adapter implemented for platform: ${platform}`);
    }

    return adapter;
  }

  /**
   * Update platform result in post record
   */
  private async updatePlatformResult(
    postId: string,
    platform: string,
    result: {
      success: boolean;
      platformPostId: string | null;
      url: string | null;
      error: string | null;
      publishedAt: string | null;
    }
  ): Promise<void> {
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) return;

    // Update platform results array
    const platformResults = (post.platformResults as any[]).map((pr: any) => {
      if (pr.platform === platform) {
        return {
          ...pr,
          status: result.success ? 'PUBLISHED' : 'FAILED',
          platformPostId: result.platformPostId,
          url: result.url,
          error: result.error,
          publishedAt: result.publishedAt
        };
      }
      return pr;
    });

    // Determine overall post status
    const allResults = platformResults;
    const successCount = allResults.filter((r: any) => r.status === 'PUBLISHED').length;
    const failedCount = allResults.filter((r: any) => r.status === 'FAILED').length;

    let overallStatus = post.status;
    if (failedCount > 0 && successCount > 0) {
      overallStatus = 'PARTIALLY_FAILED';
    } else if (failedCount === allResults.length) {
      overallStatus = 'FAILED';
    } else if (successCount === allResults.length) {
      overallStatus = 'PUBLISHED';
    }

    await prisma.post.update({
      where: { id: postId },
      data: {
        platformResults,
        status: overallStatus
      }
    });

    // Sync to associated Reel if one exists
    try {
      const associatedReel = await prisma.reel.findFirst({
        where: { postId }
      });

      if (associatedReel) {
        let reelStatus = 'PUBLISHING';
        let reelMessage = 'Reel is being published...';

        if (overallStatus === 'PUBLISHED') {
          reelStatus = 'PUBLISHED';
          reelMessage = 'Published successfully to all channels!';
        } else if (overallStatus === 'FAILED') {
          reelStatus = 'FAILED';
          const errors = platformResults
            .map((r: any) => r.error ? `${r.platform}: ${r.error}` : null)
            .filter(Boolean);
          reelMessage = `Failed to post: ${errors.join(', ')}`;
        } else if (overallStatus === 'PARTIALLY_FAILED') {
          reelStatus = 'PARTIALLY_FAILED';
          const errors = platformResults
            .map((r: any) => r.error ? `${r.platform}: ${r.error}` : null)
            .filter(Boolean);
          reelMessage = `Partially failed: ${errors.join(', ')}`;
        }

        await prisma.reel.update({
          where: { id: associatedReel.id },
          data: {
            status: reelStatus,
            statusMessage: reelMessage
          }
        });

        logger.info({
          event: 'reel_post_status_synced',
          reelId: associatedReel.id,
          postId,
          status: reelStatus,
          message: reelMessage
        });
      }
    } catch (syncErr: any) {
      logger.error({
        event: 'reel_post_sync_error',
        postId,
        error: syncErr.message
      });
    }
  }

  /**
   * Setup event handlers for worker
   */
  private setupEventHandlers() {
    this.worker.on('completed', (job: Job) => {
      logger.info({
        event: 'worker_job_completed',
        jobId: job.id,
        attempts: job.attemptsMade
      });
    });

    this.worker.on('failed', async (job: Job | undefined, error: Error) => {
      if (!job) return;

      logger.error({
        event: 'worker_job_failed',
        jobId: job.id,
        error: error.message,
        attempts: job.attemptsMade
      });

      // If max retries exceeded, move to dead-letter queue
      if (job.attemptsMade >= job.opts.attempts!) {
        await deadLetterQueue.add('dead-letter', {
          originalJobId: job.id,
          error: error.message,
          data: job.data,
          failedAt: new Date().toISOString()
        });
      }
    });

    this.worker.on('error', (error: Error) => {
      logger.error({
        event: 'worker_error',
        error: error.message
      });
    });
  }

  /**
   * Start the worker
   */
  async start() {
    logger.info({ event: 'worker_started' });
    await this.worker.waitUntilReady();
  }

  /**
   * Gracefully shutdown the worker
   */
  async shutdown() {
    logger.info({ event: 'worker_shutting_down' });
    await this.worker.close();
  }
}

// Export singleton instance
export const postWorker = new PostWorker();
