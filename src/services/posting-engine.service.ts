import fs from 'fs';
import path from 'path';
import { prisma } from '../db/prisma.js';

function logToFile(message: string) {
  const logPath = path.join(process.cwd(), 'scratch', 'backend-debug.log');
  const timestamp = new Date().toISOString();
  if (!fs.existsSync(path.dirname(logPath))) {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
  }
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}
import { mediaValidator } from './media-validator.service.js';
import { storageService } from './media-upload.service.js';
import { instagramAdapter } from '../adapters/instagram.adapter.js';
import { postQueue } from '../queues/post-queue.js';
import { convertToUTC, validateScheduledDate } from '../utils/date-time.js';
import { MediaValidationError, SchedulingError, QueueEnqueueError } from '../utils/errors.js';
import { createHash } from 'crypto';
import type { Post, PostStatus } from '@prisma/client';

export interface CreatePostData {
  content: string;
  title?: string;
  media: Array<{ file: Buffer; type: 'image' | 'video'; originalName: string }>;
  platforms: string[];
  scheduledAt?: string;
  timezone: string;
  platformOptions?: Record<string, any>;
}

export interface ScheduleResult {
  postId: string;
  jobIds: string[];
  status: PostStatus;
}

export class PostingEngineService {
  /**
   * Create a draft post (no validation or queueing)
   */
  async createDraft(userId: string, data: CreatePostData): Promise<Post> {
    const post = await prisma.post.create({
      data: {
        userId,
        title: data.title,
        rawContent: data.content,
        mediaUrls: [],
        platforms: data.platforms,
        timezone: data.timezone,
        scheduledAt: new Date(),
        status: 'DRAFT',
        platformOptions: data.platformOptions || undefined,
        platformResults: []
      }
    });

    return post;
  }

  /**
   * Schedule post for publishing
   * Validates media, uploads to S3, creates DB record, enqueues jobs
   */
  async schedulePost(userId: string, data: CreatePostData): Promise<ScheduleResult> {
    // 1. Validate scheduled time if provided
    let scheduledUTC: Date;
    if (data.scheduledAt) {
      scheduledUTC = convertToUTC(data.scheduledAt, data.timezone);
      const validation = validateScheduledDate(scheduledUTC);
      if (!validation.valid) {
        throw new SchedulingError(validation.errors.join(', '));
      }
    } else {
      scheduledUTC = new Date(); // Publish immediately
    }

    // 2. Create post record first
    const post = await prisma.post.create({
      data: {
        userId,
        title: data.title,
        rawContent: data.content,
        mediaUrls: [],
        platforms: data.platforms,
        timezone: data.timezone,
        scheduledAt: scheduledUTC,
        status: 'QUEUED',
        platformOptions: data.platformOptions || undefined,
        platformResults: data.platforms.map((platform) => ({
          platform,
          status: 'QUEUED',
          error: null,
          publishedAt: null
        }))
      },
      include: {
        media: true
      }
    });

    // 3. Validate and upload media
    const mediaUrls: string[] = [];
    const platformVariants: Record<string, any> = {};

    for (const mediaItem of data.media) {
      // Validate against all target platforms
      let lastValidation: any;
      for (const platform of data.platforms) {
        const platformOpts = data.platformOptions?.[platform] || {};
        logToFile(`SCHEDULE POST: platform=${platform}, options=${JSON.stringify(platformOpts)}`);
        
        let validation = await mediaValidator.validate(
          mediaItem.file,
          platform,
          mediaItem.type,
          platformOpts
        );

        // AUTO-FIX LOGIC: If invalid and autoFix is enabled
        if (!validation.valid && platformOpts.autoFix) {
          logToFile(`AUTO-FIX: Attempting to conform ${mediaItem.type} for ${platform}`);
          
          // Determine target ratio
          let targetRatio = 1.0; // Default square
          // Frontend sends platformOptions[PLATFORM].postType for both FB and IG
          if (platform === 'INSTAGRAM') {
            const type = platformOpts.postType || 'FEED';
            if (type === 'REEL' || type === 'STORY') targetRatio = 0.562; // 9:16
          } else if (platform === 'FACEBOOK') {
            const type = platformOpts.postType || 'FEED';
            if (type === 'REEL') targetRatio = 0.562; // Facebook Reels also require 9:16
          }

          try {
            let fixedBuffer: Buffer;

            if (mediaItem.type === 'image') {
              fixedBuffer = await storageService.conformImage(mediaItem.file, targetRatio);
            } else {
              // Video processing requires temporary files for ffmpeg
              const tempDir = path.join(process.cwd(), 'scratch', 'temp');
              if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
              
              const tempInput = path.join(tempDir, `${Date.now()}-input.mp4`);
              fs.writeFileSync(tempInput, mediaItem.file);
              
              const fixedPath = await storageService.conformVideo(tempInput, targetRatio);
              fixedBuffer = fs.readFileSync(fixedPath);
              
              // Cleanup temp files
              fs.unlinkSync(tempInput);
              fs.unlinkSync(fixedPath);
            }
            
            // Re-validate the fixed media
            const reValidation = await mediaValidator.validate(
              fixedBuffer,
              platform,
              mediaItem.type,
              platformOpts
            );

            if (reValidation.valid) {
              logToFile(`AUTO-FIX: Successfully fixed ${mediaItem.type} for ${platform}`);
              mediaItem.file = fixedBuffer; // Update original buffer
              validation = reValidation;
            } else {
              logToFile(`AUTO-FIX: Fixed ${mediaItem.type} still invalid: ${reValidation.errors.join('|')}`);
            }
          } catch (fixError) {
            logToFile(`AUTO-FIX: Error during conforming: ${fixError}`);
          }
        }

        lastValidation = validation;
        logToFile(`VALIDATION: platform=${platform}, type=${mediaItem.type}, valid=${validation.valid}, errors=${validation.errors.join('|')}`);

        if (!validation.valid) {
          logToFile(`CRITICAL: Media validation failed for ${platform}`);
          // Clean up: mark post as failed
          await prisma.post.update({
            where: { id: post.id },
            data: { status: 'FAILED' }
          });

          throw new MediaValidationError(
            `Media validation failed for ${platform}`,
            validation.errors
          );
        }
      }

      // Upload to S3
      const uploadResult = await storageService.upload(mediaItem.file, {
        mimeType: lastValidation.metadata.mimeType,
        originalName: mediaItem.originalName,
        postId: post.id
      });

      mediaUrls.push(uploadResult.url);

      // Generate platform variants
      for (const platform of data.platforms) {
        const variants = await storageService.generateVariants(mediaItem.file, platform);
        platformVariants[platform] = variants;
      }

      // Create PostMedia record
      await prisma.postMedia.create({
        data: {
          postId: post.id,
          originalUrl: uploadResult.url,
          platformVariants: platformVariants,
          mimeType: uploadResult.contentType,
          sizeBytes: mediaItem.file.length,
          dimensions: {
            width: 0,
            height: 0,
            aspectRatio: 0
          }
        }
      });
    }

    // Update post with media URLs
    await prisma.post.update({
      where: { id: post.id },
      data: { mediaUrls }
    });

    // 4. Enqueue jobs for each platform
    const jobIds: string[] = [];

    for (const platform of data.platforms) {
      const jobId = `${post.id}:${platform}:${Date.now()}`;

      try {
        const delay = scheduledUTC.getTime() - Date.now();

        await postQueue.add(
          'publish-post',
          {
            postId: post.id,
            platform,
            userId,
            content: data.content,
            mediaUrls,
            scheduledAt: scheduledUTC.toISOString()
          },
          {
            jobId,
            delay: Math.max(0, delay),
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000
            },
            removeOnComplete: 100,
            removeOnFail: false
          }
        );

        jobIds.push(jobId);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new QueueEnqueueError(
          `Failed to enqueue job for ${platform}: ${errorMessage}`,
          jobId
        );
      }
    }

    return {
      postId: post.id,
      jobIds,
      status: 'QUEUED'
    };
  }

  /**
   * Update draft post (only if status is DRAFT)
   */
  async updateDraft(
    postId: string,
    userId: string,
    data: Partial<CreatePostData>
  ): Promise<Post> {
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (post.status !== 'DRAFT') {
      throw new Error('Can only update posts in DRAFT status');
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.content && { rawContent: data.content }),
        ...(data.platforms && { platforms: data.platforms }),
        ...(data.timezone && { timezone: data.timezone })
      }
    });

    return updated;
  }

  /**
   * Delete post and remove from queue
   */
  async deletePost(postId: string, userId: string): Promise<void> {
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Remove from queue
    const jobs = await postQueue.getJobs(['delayed', 'waiting', 'active']);
    for (const job of jobs) {
      if (job.data.postId === postId) {
        await job.remove().catch(() => {});
      }
    }

    // Attempt to delete natively from published platforms
    if (post.platformResults && Array.isArray(post.platformResults)) {
      for (const result of post.platformResults as any[]) {
        if (result.status === 'PUBLISHED' && result.platformPostId) {
          try {
            const socialAccount = await prisma.socialAccount.findFirst({
              where: { userId, platform: result.platform }
            });
            if (socialAccount) {
              const { tokenCrypto } = await import('../crypto/token-crypto.service.js');
              const accessToken = tokenCrypto.decrypt(JSON.parse(socialAccount.accessToken));
              
              let adapter;
              switch(result.platform) {
                case 'FACEBOOK':
                  adapter = (await import('../adapters/facebook.adapter.js')).facebookAdapter;
                  break;
              }

              if (adapter?.deletePost) {
                await adapter.deletePost(socialAccount.externalAccountId, result.platformPostId, accessToken);
              }
            }
          } catch (e) {
            console.warn(`Failed to execute remote deletion for ${result.platform}`);
          }
        }
      }
    }

    // Completely wipe post and linked media
    await prisma.postMedia.deleteMany({
      where: { postId }
    });

    await prisma.post.delete({
      where: { id: postId }
    });
  }

  /**
   * Get post status with platform results
   */
  async getPostStatus(postId: string, userId: string): Promise<Post> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        media: true
      }
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return post;
  }

  /**
   * List user's posts with optional filters
   */
  async listPosts(
    userId: string,
    filters?: {
      status?: string;
      platform?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Post[]> {
    const where: any = { userId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.platform) {
      where.platforms = { has: filters.platform };
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
      include: {
        media: true
      }
    });

    return posts;
  }

  /**
   * Generate content hash for idempotency check
   */
  private generateContentHash(userId: string, content: string, scheduledAt: Date): string {
    return createHash('sha256')
      .update(`${userId}:${content}:${scheduledAt.toISOString()}`)
      .digest('hex');
  }
}

export const postingEngine = new PostingEngineService();
