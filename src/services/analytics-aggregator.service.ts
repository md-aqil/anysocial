import { prisma } from '../db/prisma.js';
import { logger } from '../logger/pino.js';

export interface AggregatedMetrics {
  totalPosts: number;
  publishedPosts: number;
  failedPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalReach: number;
  totalImpressions: number;
  engagementRate: number;
  platformBreakdown: Record<string, PlatformMetrics>;
}

export interface PlatformMetrics {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ReportData {
  userId: string;
  dateRange: DateRange;
  generatedAt: Date;
  summary: AggregatedMetrics;
  posts: PostAnalyticsRow[];
}

export interface PostAnalyticsRow {
  id: string;
  title: string | null;
  platforms: string[];
  publishedAt: Date | null;
  status: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  engagementRate: number;
}

export class AnalyticsAggregatorService {
  static computeEngagementRate(metrics: { likes: number; comments: number; shares: number }, reach: number): number {
    if (reach === 0) return 0;
    const engagement = metrics.likes + metrics.comments + metrics.shares;
    return (engagement / reach) * 100;
  }

  static normalizeMetrics(metrics: PlatformMetrics, platform: string): PlatformMetrics {
    const platformMultipliers: Record<string, number> = {
      INSTAGRAM: 1.0,
      LINKEDIN: 0.8,
      TWITTER: 1.2,
      TIKTOK: 1.5,
      YOUTUBE: 0.9,
    };
    
    const multiplier = platformMultipliers[platform] || 1.0;
    
    return {
      likes: metrics.likes * multiplier,
      comments: metrics.comments * multiplier,
      shares: metrics.shares * multiplier,
      reach: metrics.reach * multiplier,
      engagementRate: metrics.engagementRate * multiplier,
    };
  }

  static async getUserSummary(userId: string, days: number = 7): Promise<AggregatedMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const posts = await prisma.post.findMany({
      where: {
        userId,
        publishedAt: { gte: startDate },
        status: { in: ['PUBLISHED', 'FAILED'] },
      },
      include: {
        analytics: true,
      },
    });

    let totalLikes = 0;
    let totalComments = 0;
    let totalShares = 0;
    let totalReach = 0;
    let totalImpressions = 0;
    const platformBreakdown: Record<string, PlatformMetrics> = {};

    for (const post of posts) {
      const platformMetrics: Record<string, PlatformMetrics> = {};
      
      for (const analytics of post.analytics) {
        const metrics = analytics.metrics as any;
        const platform = analytics.platform;
        
        const likes = metrics?.likes || 0;
        const comments = metrics?.comments || 0;
        const shares = metrics?.shares || 0;
        const reach = metrics?.reach || 0;
        const impressions = metrics?.impressions || 0;
        
        totalLikes += likes;
        totalComments += comments;
        totalShares += shares;
        totalReach += reach;
        totalImpressions += impressions;
        
        if (!platformMetrics[platform]) {
          platformMetrics[platform] = { likes: 0, comments: 0, shares: 0, reach: 0, engagementRate: 0 };
        }
        
        platformMetrics[platform].likes += likes;
        platformMetrics[platform].comments += comments;
        platformMetrics[platform].shares += shares;
        platformMetrics[platform].reach += reach;
      }
      
      for (const [platform, pMetrics] of Object.entries(platformMetrics)) {
        if (!platformBreakdown[platform]) {
          platformBreakdown[platform] = { likes: 0, comments: 0, shares: 0, reach: 0, engagementRate: 0 };
        }
        
        platformBreakdown[platform].likes += pMetrics.likes;
        platformBreakdown[platform].comments += pMetrics.comments;
        platformBreakdown[platform].shares += pMetrics.shares;
        platformBreakdown[platform].reach += pMetrics.reach;
      }
    }

    for (const platform of Object.keys(platformBreakdown)) {
      const pMetrics = platformBreakdown[platform];
      pMetrics.engagementRate = this.computeEngagementRate(
        { likes: pMetrics.likes, comments: pMetrics.comments, shares: pMetrics.shares },
        pMetrics.reach
      );
    }

    const engagementRate = this.computeEngagementRate(
      { likes: totalLikes, comments: totalComments, shares: totalShares },
      totalReach
    );

    return {
      totalPosts: posts.length,
      publishedPosts: posts.filter((p) => p.status === 'PUBLISHED').length,
      failedPosts: posts.filter((p) => p.status === 'FAILED').length,
      totalLikes,
      totalComments,
      totalShares,
      totalReach,
      totalImpressions,
      engagementRate,
      platformBreakdown,
    };
  }

  static async getPostsAnalytics(userId: string, dateRange?: DateRange): Promise<PostAnalyticsRow[]> {
    const where: any = { userId, status: 'PUBLISHED' };
    
    if (dateRange) {
      where.publishedAt = { gte: dateRange.start, lte: dateRange.end };
    }

    const posts = await prisma.post.findMany({
      where,
      include: { analytics: true },
      orderBy: { publishedAt: 'desc' },
    });

    return posts.map((post) => {
      let totalLikes = 0;
      let totalComments = 0;
      let totalShares = 0;
      let totalReach = 0;

      for (const analytics of post.analytics) {
        const metrics = analytics.metrics as any;
        totalLikes += metrics?.likes || 0;
        totalComments += metrics?.comments || 0;
        totalShares += metrics?.shares || 0;
        totalReach += metrics?.reach || 0;
      }

      const engagementRate = this.computeEngagementRate(
        { likes: totalLikes, comments: totalComments, shares: totalShares },
        totalReach
      );

      return {
        id: post.id,
        title: post.title,
        platforms: post.platforms,
        publishedAt: post.publishedAt,
        status: post.status,
        likes: totalLikes,
        comments: totalComments,
        shares: totalShares,
        reach: totalReach,
        engagementRate,
      };
    });
  }

  static async generateReport(
    userId: string,
    dateRange: DateRange,
    format: 'csv' | 'json' | 'pdf'
  ): Promise<Buffer> {
    const summary = await this.getUserSummary(userId, 30);
    const posts = await this.getPostsAnalytics(userId, dateRange);

    const reportData: ReportData = {
      userId,
      dateRange,
      generatedAt: new Date(),
      summary,
      posts,
    };

    switch (format) {
      case 'csv':
        return this.generateCSV(reportData);
      case 'json':
        return Buffer.from(JSON.stringify(reportData, null, 2));
      case 'pdf':
        return this.generatePDF(reportData);
      default:
        throw new Error('Invalid format');
    }
  }

  private static generateCSV(data: ReportData): Buffer {
    const lines: string[] = [];
    
    lines.push('Post ID,Title,Platforms,Published At,Status,Likes,Comments,Shares,Reach,Engagement Rate');
    
    for (const post of data.posts) {
      lines.push([
        post.id,
        post.title || '',
        post.platforms.join(';'),
        post.publishedAt?.toISOString() || '',
        post.status,
        post.likes.toString(),
        post.comments.toString(),
        post.shares.toString(),
        post.reach.toString(),
        post.engagementRate.toFixed(2),
      ].join(','));
    }

    return Buffer.from(lines.join('\n'));
  }

  private static generatePDF(data: ReportData): Buffer {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    
    doc.fontSize(20).text('Analytics Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${data.generatedAt.toISOString()}`);
    doc.text(`Date Range: ${data.dateRange.start.toISOString()} - ${data.dateRange.end.toISOString()}`);
    doc.moveDown();
    
    doc.fontSize(16).text('Summary');
    doc.fontSize(12);
    doc.text(`Total Posts: ${data.summary.totalPosts}`);
    doc.text(`Published: ${data.summary.publishedPosts}`);
    doc.text(`Failed: ${data.summary.failedPosts}`);
    doc.text(`Total Likes: ${data.summary.totalLikes}`);
    doc.text(`Total Comments: ${data.summary.totalComments}`);
    doc.text(`Total Shares: ${data.summary.totalShares}`);
    doc.text(`Total Reach: ${data.summary.totalReach}`);
    doc.text(`Engagement Rate: ${data.summary.engagementRate.toFixed(2)}%`);
    
    doc.end();
    
    return Buffer.concat(chunks);
  }

  static async createDailyRollup(userId: string, date: Date): Promise<void> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const summary = await this.getUserSummary(userId, 1);
    
    const posts = await prisma.post.findMany({
      where: {
        userId,
        publishedAt: { gte: startOfDay, lte: endOfDay },
        status: 'PUBLISHED',
      },
    });

    await prisma.analyticsRollup.upsert({
      where: {
        userId_date_period_platform: {
          userId,
          date: startOfDay,
          period: 'daily',
          platform: null as any,
        },
      },
      create: {
        userId,
        date: startOfDay,
        period: 'daily',
        totalPosts: summary.totalPosts,
        published: summary.publishedPosts,
        failed: summary.failedPosts,
        totalLikes: summary.totalLikes,
        totalComments: summary.totalComments,
        totalShares: summary.totalShares,
        totalReach: summary.totalReach,
        engagementRate: summary.engagementRate,
      },
      update: {
        totalPosts: summary.totalPosts,
        published: summary.publishedPosts,
        failed: summary.failedPosts,
        totalLikes: summary.totalLikes,
        totalComments: summary.totalComments,
        totalShares: summary.totalShares,
        totalReach: summary.totalReach,
        engagementRate: summary.engagementRate,
      },
    });

    logger.info({ userId, date: startOfDay.toISOString() }, 'Daily analytics rollup created');
  }
}