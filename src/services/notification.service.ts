import { prisma } from '../db/prisma.js';
import { logger } from '../logger/pino.js';
import { NotificationType, NotificationStatus } from '@prisma/client';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

const templates: Record<string, EmailTemplate> = {
  'post.published': {
    subject: 'Your post has been published!',
    html: `<h1>Post Published</h1><p>Your post has been successfully published to: {{platforms}}.</p>`,
    text: `Your post has been successfully published to: {{platforms}}.`,
  },
  'post.failed': {
    subject: 'Post publishing failed',
    html: `<h1>Post Failed</h1><p>Your post failed to publish. Error: {{error}}</p>`,
    text: `Your post failed to publish. Error: {{error}}`,
  },
  'weekly-digest': {
    subject: 'Your weekly analytics digest',
    html: `<h1>Weekly Digest</h1><p>Your posts reached {{totalReach}} people this week with {{totalEngagement}} engagements.</p>`,
    text: `Your posts reached {{totalReach}} people this week with {{totalEngagement}} engagements.`,
  },
};

export class NotificationService {
  private static async sendEmail(to: string, template: EmailTemplate, data: Record<string, string>): Promise<boolean> {
    const subject = this.replaceVariables(template.subject, data);
    const html = this.replaceVariables(template.html, data);
    const text = this.replaceVariables(template.text, data);

    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      logger.warn('RESEND_API_KEY not configured, skipping email');
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
          to,
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error({ to, error }, 'Failed to send email via Resend');
        return false;
      }

      logger.info({ to, subject }, 'Email sent successfully');
      return true;
    } catch (error) {
      logger.error({ to, error: (error as Error).message }, 'Email send failed');
      return false;
    }
  }

  private static replaceVariables(template: string, data: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  static async sendNotification(
    userId: string,
    type: NotificationType,
    event: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const logEntry = await prisma.notificationLog.create({
      data: {
        userId,
        type,
        event,
        payload: data as any,
        status: NotificationStatus.PENDING,
      },
    });

    try {
      switch (type) {
        case NotificationType.EMAIL:
          const template = templates[event];
          if (template) {
            const stringData: Record<string, string> = {};
            for (const [key, value] of Object.entries(data)) {
              stringData[key] = String(value);
            }
            
            const success = await this.sendEmail(user.email, template, stringData);
            
            await prisma.notificationLog.update({
              where: { id: logEntry.id },
              data: {
                status: success ? NotificationStatus.SENT : NotificationStatus.FAILED,
                attempts: 1,
                lastAttemptAt: new Date(),
                errorMessage: success ? null : 'Failed to send email',
              },
            });
          }
          break;

        case NotificationType.IN_APP:
          await prisma.notification.create({
            data: {
              userId,
              type: NotificationType.IN_APP,
              title: this.getNotificationTitle(event),
              message: this.getNotificationMessage(event, data),
              data: data as any,
            },
          });

          await prisma.notificationLog.update({
            where: { id: logEntry.id },
            data: {
              status: NotificationStatus.SENT,
              attempts: 1,
              lastAttemptAt: new Date(),
            },
          });
          break;

        case NotificationType.PUSH:
          logger.warn({ userId, event }, 'Push notifications not yet implemented');
          break;

        default:
          logger.warn({ userId, type }, 'Unknown notification type');
      }
    } catch (error) {
      await prisma.notificationLog.update({
        where: { id: logEntry.id },
        data: {
          status: NotificationStatus.FAILED,
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
          errorMessage: (error as Error).message,
        },
      });

      logger.error({ userId, event, error: (error as Error).message }, 'Notification failed');
    }
  }

  private static getNotificationTitle(event: string): string {
    const titles: Record<string, string> = {
      'post.published': 'Post Published',
      'post.failed': 'Post Failed',
      'post.viral': 'Post Went Viral!',
      'quota.warning': 'Quota Warning',
    };
    return titles[event] || 'Notification';
  }

  private static getNotificationMessage(event: string, data: Record<string, unknown>): string {
    const messages: Record<string, string> = {
      'post.published': `Your post has been published to ${(data.platforms as string[] || []).join(', ')}`,
      'post.failed': `Your post failed to publish. Error: ${data.error}`,
      'post.viral': `Your post has reached ${data.reach} people!`,
      'quota.warning': `You've used ${data.percentage}% of your monthly quota`,
    };
    return messages[event] || 'You have a new notification';
  }

  static async sendPostPublishedNotification(postId: string): Promise<void> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { user: true },
    });

    if (!post) return;

    const platforms = post.platforms.join(', ');

    await this.sendNotification(post.userId, NotificationType.IN_APP, 'post.published', {
      postId: post.id,
      title: post.title,
      platforms,
    });

    await this.sendNotification(post.userId, NotificationType.EMAIL, 'post.published', {
      platforms,
    });
  }

  static async sendPostFailedNotification(postId: string, error: string): Promise<void> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { user: true },
    });

    if (!post) return;

    await this.sendNotification(post.userId, NotificationType.IN_APP, 'post.failed', {
      postId: post.id,
      title: post.title,
      error,
    });

    await this.sendNotification(post.userId, NotificationType.EMAIL, 'post.failed', {
      title: post.title || 'Untitled',
      error,
    });
  }

  static async sendWeeklyDigest(userId: string, stats: { totalReach: number; totalEngagement: number }): Promise<void> {
    await this.sendNotification(userId, NotificationType.EMAIL, 'weekly-digest', {
      totalReach: stats.totalReach.toString(),
      totalEngagement: stats.totalEngagement.toString(),
    });
  }

  static async getUserNotifications(userId: string, limit: number = 20): Promise<any[]> {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async markNotificationRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  static async markAllNotificationsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}