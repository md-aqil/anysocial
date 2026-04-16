import { prisma } from '../db/prisma.js';
import { redis } from '../db/redis.js';
import { logger } from '../logger/pino.js';
import { Platform, FetchStatus } from '@prisma/client';

export interface PlatformMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  impressions: number;
  clicks: number;
  videoViews?: number;
}

export interface AnalyticsResult {
  postId: string;
  platform: Platform;
  metrics: PlatformMetrics;
  fetchedAt: Date;
  success: boolean;
  error?: string;
}

interface PlatformAdapter {
  fetchMetrics(account: any, postId: string, externalPostId: string): Promise<PlatformMetrics>;
}

class InstagramAdapter implements PlatformAdapter {
  async fetchMetrics(account: any, postId: string, externalPostId: string): Promise<PlatformMetrics> {
    const baseUrl = 'https://graph.facebook.com/v18.0';
    const token = account.accessToken;
    
    try {
      const response = await fetch(
        `${baseUrl}/${externalPostId}/insights?access_token=${token}&metric=likes,comments,shares,saves,reach,impressions`
      );
      
      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const metricsMap: Record<string, number> = {};
      for (const item of data.data || []) {
        metricsMap[item.name] = parseInt(item.values?.[0]?.value || '0', 10);
      }
      
      return {
        likes: metricsMap.likes || 0,
        comments: metricsMap.comments || 0,
        shares: metricsMap.shares || 0,
        saves: metricsMap.saves || 0,
        reach: metricsMap.reach || 0,
        impressions: metricsMap.impressions || 0,
        clicks: 0,
      };
    } catch (error) {
      logger.error({ postId, platform: 'INSTAGRAM', error: (error as Error).message }, 'Failed to fetch Instagram metrics');
      throw error;
    }
  }
}

class LinkedInAdapter implements PlatformAdapter {
  async fetchMetrics(account: any, postId: string, externalPostId: string): Promise<PlatformMetrics> {
    const baseUrl = 'https://api.linkedin.com/v2';
    const token = account.accessToken;
    
    try {
      const response = await fetch(
        `${baseUrl}/ugcPosts/${externalPostId}?projection=(id,created,totalShares,reactionSummaries,commentSummaries)`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (!response.ok) {
        throw new Error(`LinkedIn API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      const reactionSummary = data.reactionSummaries || [];
      const commentSummary = data.commentSummaries || [];
      
      const getCount = (type: string) => {
        const summary = reactionSummary.find((r: any) => r.code === type);
        return summary ? summary.count : 0;
      };
      
      return {
        likes: getCount('LIKE') + getCount('LIKE') + getCount('PRAISE') + getCount('APPRECiation'),
        comments: commentSummary.length > 0 ? commentSummary[0].count : 0,
        shares: data.totalShares || 0,
        saves: 0,
        reach: 0,
        impressions: 0,
        clicks: 0,
      };
    } catch (error) {
      logger.error({ postId, platform: 'LINKEDIN', error: (error as Error).message }, 'Failed to fetch LinkedIn metrics');
      throw error;
    }
  }
}

class TwitterAdapter implements PlatformAdapter {
  async fetchMetrics(account: any, postId: string, externalPostId: string): Promise<PlatformMetrics> {
    const baseUrl = 'https://api.twitter.com/2';
    const token = account.accessToken;
    
    try {
      const response = await fetch(
        `${baseUrl}/tweets/${externalPostId}?tweet.fields=public_metrics`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.status}`);
      }
      
      const data = await response.json();
      const metrics = data.data?.public_metrics || {};
      
      return {
        likes: metrics.likes || 0,
        comments: metrics.replies || 0,
        shares: metrics.retweets || 0,
        saves: metrics.bookmarks || 0,
        reach: metrics.impressions || 0,
        impressions: metrics.impressions || 0,
        clicks: metrics.url_clicks || 0,
      };
    } catch (error) {
      logger.error({ postId, platform: 'TWITTER', error: (error as Error).message }, 'Failed to fetch Twitter metrics');
      throw error;
    }
  }
}

class TikTokAdapter implements PlatformAdapter {
  async fetchMetrics(account: any, postId: string, externalPostId: string): Promise<PlatformMetrics> {
    const baseUrl = 'https://open.tiktokapis.com/v2';
    const token = account.accessToken;
    
    try {
      const response = await fetch(
        `${baseUrl}/video/info/?fields=share_url,like_count,comment_count,share_count,view_count`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ids: [externalPostId] }),
        }
      );
      
      if (!response.ok) {
        throw new Error(`TikTok API error: ${response.status}`);
      }
      
      const data = await response.json();
      const video = data.data?.[0] || {};
      
      return {
        likes: video.like_count || 0,
        comments: video.comment_count || 0,
        shares: video.share_count || 0,
        saves: 0,
        reach: video.view_count || 0,
        impressions: video.view_count || 0,
        clicks: 0,
        videoViews: video.view_count || 0,
      };
    } catch (error) {
      logger.error({ postId, platform: 'TIKTOK', error: (error as Error).message }, 'Failed to fetch TikTok metrics');
      throw error;
    }
  }
}

class YouTubeAdapter implements PlatformAdapter {
  async fetchMetrics(account: any, postId: string, externalPostId: string): Promise<PlatformMetrics> {
    const baseUrl = 'https://www.googleapis.com/youtube/v3';
    const token = account.accessToken;
    
    try {
      const response = await fetch(
        `${baseUrl}/videos?part=statistics&id=${externalPostId}&key=${process.env.YOUTUBE_API_KEY}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }
      
      const data = await response.json();
      const stats = data.items?.[0]?.statistics || {};
      
      return {
        likes: parseInt(stats.likeCount || '0', 10),
        comments: parseInt(stats.commentCount || '0', 10),
        shares: 0,
        saves: parseInt(stats.favoriteCount || '0', 10),
        reach: parseInt(stats.viewCount || '0', 10),
        impressions: parseInt(stats.viewCount || '0', 10),
        clicks: 0,
        videoViews: parseInt(stats.viewCount || '0', 10),
      };
    } catch (error) {
      logger.error({ postId, platform: 'YOUTUBE', error: (error as Error).message }, 'Failed to fetch YouTube metrics');
      throw error;
    }
  }
}

const adapters: Record<string, PlatformAdapter> = {
  INSTAGRAM: new InstagramAdapter(),
  LINKEDIN: new LinkedInAdapter(),
  TWITTER: new TwitterAdapter(),
  TIKTOK: new TikTokAdapter(),
  YOUTUBE: new YouTubeAdapter(),
};

const CACHE_TTL = 900;
const FETCH_INTERVALS = [
  { hours: 1, label: '1h' },
  { hours: 6, label: '6h' },
  { hours: 24, label: '24h' },
  { hours: 168, label: '7d' },
];

export class AnalyticsFetcherService {
  private static getCacheKey(postId: string, platform: string): string {
    return `analytics:post:${postId}:${platform}`;
  }

  static async fetchPostAnalytics(postId: string): Promise<AnalyticsResult[]> {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { user: { include: { socialAccounts: true } } },
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (post.status !== 'PUBLISHED') {
      throw new Error('Post not published yet');
    }

    const results: AnalyticsResult[] = [];
    const platformResults = post.platformResults as any[] || [];

    for (const platformStr of post.platforms) {
      const platform = platformStr.toUpperCase() as Platform;
      const adapter = adapters[platform];
      
      if (!adapter) {
        logger.warn({ postId, platform }, 'No adapter found for platform');
        continue;
      }

      const platformResult = platformResults.find((r) => r.platform?.toUpperCase() === platform);
      const externalPostId = platformResult?.postId;

      if (!externalPostId) {
        logger.warn({ postId, platform }, 'No external post ID found');
        continue;
      }

      const account = post.user.socialAccounts.find(
        (a) => a.platform === platform && a.status === 'CONNECTED'
      );

      if (!account) {
        logger.warn({ postId, platform }, 'No connected account found');
        continue;
      }

      try {
        const metrics = await adapter.fetchMetrics(account, postId, externalPostId);
        
        await prisma.postAnalytics.upsert({
          where: { postId_platform: { postId, platform } },
          create: {
            postId,
            platform,
            publishedAt: post.publishedAt || new Date(),
            metrics,
            lastFetchedAt: new Date(),
            fetchStatus: FetchStatus.SUCCESS,
          },
          update: {
            metrics,
            lastFetchedAt: new Date(),
            fetchStatus: FetchStatus.SUCCESS,
            fetchError: null,
          },
        });

        const cacheKey = this.getCacheKey(postId, platform);
        await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(metrics));

        results.push({
          postId,
          platform,
          metrics,
          fetchedAt: new Date(),
          success: true,
        });

        logger.info({ postId, platform, metrics }, 'Analytics fetched successfully');
      } catch (error) {
        const errorMessage = (error as Error).message;
        const isRateLimited = errorMessage.includes('rate limit') || errorMessage.includes('429');

        await prisma.postAnalytics.upsert({
          where: { postId_platform: { postId, platform } },
          create: {
            postId,
            platform,
            publishedAt: post.publishedAt || new Date(),
            metrics: {},
            lastFetchedAt: new Date(),
            fetchStatus: isRateLimited ? FetchStatus.RATE_LIMITED : FetchStatus.FAILED,
            fetchError: errorMessage,
          },
          update: {
            lastFetchedAt: new Date(),
            fetchStatus: isRateLimited ? FetchStatus.RATE_LIMITED : FetchStatus.FAILED,
            fetchError: errorMessage,
          },
        });

        results.push({
          postId,
          platform,
          metrics: { likes: 0, comments: 0, shares: 0, saves: 0, reach: 0, impressions: 0, clicks: 0 },
          fetchedAt: new Date(),
          success: false,
          error: errorMessage,
        });

        logger.error({ postId, platform, error: errorMessage }, 'Analytics fetch failed');
      }
    }

    return results;
  }

  static async scheduleAnalyticsFetch(postId: string): Promise<void> {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    
    if (!post || !post.publishedAt) return;

    for (const interval of FETCH_INTERVALS) {
      const fetchAt = new Date(post.publishedAt.getTime() + interval.hours * 60 * 60 * 1000);
      
      if (fetchAt > new Date()) {
        const delay = fetchAt.getTime() - Date.now();
        
        setTimeout(() => {
          this.fetchPostAnalytics(postId).catch((err) => {
            logger.error({ postId, error: err.message }, 'Scheduled analytics fetch failed');
          });
        }, delay);
      }
    }
  }

  static async getCachedAnalytics(postId: string, platform: string): Promise<PlatformMetrics | null> {
    const cacheKey = this.getCacheKey(postId, platform);
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const analytics = await prisma.postAnalytics.findUnique({
      where: { postId_platform: { postId, platform: platform.toUpperCase() as Platform } },
    });
    
    if (analytics && analytics.fetchStatus === FetchStatus.SUCCESS) {
      return analytics.metrics as unknown as PlatformMetrics;
    }
    
    return null;
  }

  static async fetchAllPendingAnalytics(): Promise<void> {
    const pending = await prisma.postAnalytics.findMany({
      where: {
        fetchStatus: { in: [FetchStatus.PENDING, FetchStatus.FAILED, FetchStatus.RATE_LIMITED] },
      },
      take: 100,
    });

    for (const analytics of pending) {
      try {
        await this.fetchPostAnalytics(analytics.postId);
      } catch (error) {
        logger.error({ postId: analytics.postId, error: (error as Error).message }, 'Batch analytics fetch failed');
      }
    }
  }
}