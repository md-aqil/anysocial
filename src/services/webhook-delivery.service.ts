import { prisma } from '../db/prisma.js';
import { logger } from '../logger/pino.js';
import { NotificationType, NotificationStatus } from '@prisma/client';
import crypto from 'crypto';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  attempts: number;
}

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];

export class WebhookDeliveryService {
  private static generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  private static async deliverToEndpoint(
    url: string,
    payload: WebhookPayload,
    secret: string
  ): Promise<DeliveryResult> {
    const body = JSON.stringify(payload);
    const signature = this.generateSignature(body, secret);
    let attempts = 0;

    for (let i = 0; i < MAX_RETRIES; i++) {
      attempts = i + 1;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': payload.timestamp,
          },
          body,
          signal: AbortSignal.timeout(10000),
        });

        if (response.ok) {
          return { success: true, statusCode: response.status, attempts };
        }

        if (response.status >= 500) {
          const delay = RETRY_DELAYS[i] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        return {
          success: false,
          statusCode: response.status,
          error: `HTTP ${response.status}`,
          attempts,
        };
      } catch (error) {
        const errorMessage = (error as Error).message;
        
        if (errorMessage.includes('abort') || errorMessage.includes('timeout')) {
          if (i < MAX_RETRIES - 1) {
            const delay = RETRY_DELAYS[i] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }

        return {
          success: false,
          error: errorMessage,
          attempts,
        };
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
      attempts,
    };
  }

  static async deliverEvent(userId: string, eventType: string, data: Record<string, unknown>): Promise<void> {
    const subscriptions = await prisma.webhookSubscription.findMany({
      where: {
        userId,
        isActive: true,
        events: { has: eventType },
      },
    });

    if (subscriptions.length === 0) {
      logger.debug({ userId, eventType }, 'No webhook subscriptions found');
      return;
    }

    const payload: WebhookPayload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    for (const subscription of subscriptions) {
      const result = await this.deliverToEndpoint(
        subscription.endpointUrl,
        payload,
        subscription.secret
      );

      await prisma.notificationLog.create({
        data: {
          userId,
          type: NotificationType.WEBHOOK,
          event: eventType,
          payload: data as any,
          status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
          attempts: result.attempts,
          lastAttemptAt: new Date(),
          errorMessage: result.error,
        },
      });

      if (result.success) {
        logger.info({ userId, eventType, endpoint: subscription.endpointUrl }, 'Webhook delivered');
      } else {
        logger.error({ userId, eventType, endpoint: subscription.endpointUrl, error: result.error }, 'Webhook delivery failed');
      }
    }
  }

  static async deliverPostPublished(postId: string): Promise<void> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { user: true },
    });

    if (!post) return;

    await this.deliverEvent(post.userId, 'post.published', {
      postId: post.id,
      title: post.title,
      platforms: post.platforms,
      publishedAt: post.publishedAt?.toISOString(),
      status: post.status,
    });
  }

  static async deliverPostFailed(postId: string, error: string): Promise<void> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { user: true },
    });

    if (!post) return;

    await this.deliverEvent(post.userId, 'post.failed', {
      postId: post.id,
      title: post.title,
      platforms: post.platforms,
      error,
    });
  }

  static async deliverPostViral(postId: string, reach: number): Promise<void> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { user: true },
    });

    if (!post) return;

    await this.deliverEvent(post.userId, 'post.viral', {
      postId: post.id,
      title: post.title,
      platforms: post.platforms,
      reach,
      threshold: process.env.VIRAL_REACH_THRESHOLD || '10000',
    });
  }

  static async deliverQuotaWarning(userId: string, usage: number, limit: number): Promise<void> {
    await this.deliverEvent(userId, 'quota.warning', {
      usage,
      limit,
      percentage: Math.round((usage / limit) * 100),
    });
  }

  static async testEndpoint(userId: string, endpointUrl: string): Promise<DeliveryResult> {
    const payload: WebhookPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'Test webhook from SEO Genie' },
    };

    const secret = crypto.randomBytes(32).toString('hex');
    return this.deliverToEndpoint(endpointUrl, payload, secret);
  }
}