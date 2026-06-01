import { prisma } from '../db/prisma.js';
import { tokenCrypto } from '../crypto/token-crypto.service.js';
import { Platform } from '@prisma/client';
import { logger } from '../logger/pino.js';

export interface FetchedPost {
  externalPostId: string;
  content: string | null;
  mediaUrls: string[];
  metrics: any;
  publishedAt: Date;
}

export class FeedCurationService {
  /**
   * Fetches the user's organic posts from a specific platform.
   */
  async fetchFeed(userId: string, platform: Platform): Promise<FetchedPost[]> {
    switch (platform) {
      case 'LINKEDIN':
        return this.fetchLinkedInFeed(userId);
      case 'INSTAGRAM':
        return this.fetchInstagramFeed(userId);
      default:
        throw new Error(`Feed fetching not implemented for ${platform}`);
    }
  }

  private async fetchLinkedInFeed(userId: string): Promise<FetchedPost[]> {
    // 1. Get the user's connected LinkedIn account
    const account = await prisma.socialAccount.findFirst({
      where: {
        userId,
        platform: 'LINKEDIN',
        status: 'CONNECTED',
      },
    });

    if (!account) {
      throw new Error('No connected LinkedIn account found for this user.');
    }

    const encryptedToken = JSON.parse(account.accessToken);
    const accessToken = tokenCrypto.decrypt(encryptedToken);

    // LinkedIn uses the URN format for authors: urn:li:person:{id}
    const authorUrn = `urn:li:person:${account.externalAccountId}`;

    try {
      // 2. Fetch the UGC Posts
      // See: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api
      const url = `https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${authorUrn})&sortBy=LAST_MODIFIED`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ error: errorText, status: response.status }, 'LinkedIn UGC Posts fetch failed');
        throw new Error(`LinkedIn API returned ${response.status}`);
      }

      const data = await response.json() as any;
      const elements = data.elements || [];

      // 3. Map to FetchedPost format
      return elements.map((item: any): FetchedPost => {
        const shareContent = item.specificContent?.['com.linkedin.ugc.ShareContent'];
        const mediaUrls: string[] = [];
        
        let content = shareContent?.shareCommentary?.text || null;

        if (shareContent?.media) {
          shareContent.media.forEach((mediaItem: any) => {
            // Depending on the media type (image/video), the URL location might differ slightly.
            // Usually it's in originalUrl or a resolved asset. We grab what we can for display.
            const url = mediaItem.originalUrl || mediaItem.thumbnails?.[0]?.url;
            if (url) mediaUrls.push(url);
          });
        }

        return {
          externalPostId: item.id,
          content,
          mediaUrls,
          metrics: null, // For organic feeds, we might need a separate call or it comes with projections.
          publishedAt: new Date(item.created?.time || Date.now()),
        };
      });

    } catch (error) {
      logger.error({ userId, error: (error as Error).message }, 'Failed to fetch LinkedIn feed');
      throw error;
    }
  }

  private async fetchInstagramFeed(userId: string): Promise<FetchedPost[]> {
    const account = await prisma.socialAccount.findFirst({
      where: {
        userId,
        platform: 'INSTAGRAM',
        status: 'CONNECTED',
      },
    });

    if (!account) {
      throw new Error('No connected Instagram account found for this user.');
    }

    const encryptedToken = JSON.parse(account.accessToken);
    const accessToken = tokenCrypto.decrypt(encryptedToken);

    try {
      const url = `https://graph.facebook.com/v21.0/${account.externalAccountId}/media?fields=id,caption,media_url,media_type,timestamp,thumbnail_url,like_count,comments_count&access_token=${accessToken}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ error: errorText, status: response.status }, 'Instagram Media fetch failed');
        throw new Error(`Instagram API returned ${response.status}`);
      }

      const data = await response.json() as any;
      const elements = data.data || [];

      return elements.map((item: any): FetchedPost => {
        const mediaUrls: string[] = [];
        if (item.media_url) {
          mediaUrls.push(item.media_url);
        } else if (item.thumbnail_url) {
          mediaUrls.push(item.thumbnail_url);
        }

        return {
          externalPostId: item.id,
          content: item.caption || null,
          mediaUrls,
          metrics: {
            likes: item.like_count || 0,
            comments: item.comments_count || 0,
          },
          publishedAt: new Date(item.timestamp || Date.now()),
        };
      });
    } catch (error) {
      logger.error({ userId, error: (error as Error).message }, 'Failed to fetch Instagram feed');
      throw error;
    }
  }

  /**
   * Saves selected posts to the curated_posts table
   */
  async saveCuratedPosts(userId: string, platform: Platform, posts: FetchedPost[]): Promise<void> {
    const creates = posts.map(post => {
      return prisma.curatedPost.upsert({
        where: {
          userId_platform_externalPostId: {
            userId,
            platform,
            externalPostId: post.externalPostId,
          }
        },
        update: {
          content: post.content,
          mediaUrls: post.mediaUrls,
          metrics: post.metrics,
          publishedAt: post.publishedAt,
        },
        create: {
          userId,
          platform,
          externalPostId: post.externalPostId,
          content: post.content,
          mediaUrls: post.mediaUrls,
          metrics: post.metrics,
          publishedAt: post.publishedAt,
        }
      });
    });

    await prisma.$transaction(creates);
  }

  /**
   * Gets a user's curated feed for public display
   */
  async getCuratedFeed(userId: string, platform?: Platform) {
    const whereClause: any = { userId };
    if (platform) {
      whereClause.platform = platform;
    }

    return prisma.curatedPost.findMany({
      where: whereClause,
      orderBy: { publishedAt: 'desc' },
    });
  }
}

export const feedCurationService = new FeedCurationService();
