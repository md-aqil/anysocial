import { Worker, Job } from 'bullmq';
import { redis } from '../db/redis.js';
import { prisma } from '../db/prisma.js';
import { postQueue, deadLetterQueue, type PostJobData, type PostJobResult } from '../queues/post-queue.js';
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
        concurrency: 5, // Process 5 jobs simultaneously
        limiter: {
          max: 10,
          duration: 1000 // 10 jobs per second
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
      const payload = adapter.prepareContent(content, platform);
      payload.mediaUrls = adapter.formatMediaUrls(mediaUrls, platform);
      
      const customOptions = post.platformOptions ? (post.platformOptions as any)[platform] : {};

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

      // Update platform result with error
      await this.updatePlatformResult(postId, platform, {
        success: false,
        platformPostId: null,
        url: null,
        error: errorMessage,
        publishedAt: null
      });

      throw error; // Re-throw to trigger BullMQ retry
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
