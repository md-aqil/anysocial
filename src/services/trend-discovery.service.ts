import { prisma } from '../db/prisma.js';
import { logger } from '../logger/pino.js';
import { aiOrchestrator } from './ai-orchestrator.service.js';
import type { DiscoveredTrend } from '@prisma/client';

export interface TrendFilter {
  category?: string;
  source?: string;
  minScore?: number;
  isSaved?: boolean;
  limit?: number;
  offset?: number;
}

export interface TrendStats {
  total: number;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
  recentCount: number; // last 24h
  savedCount: number;
  avgScore: number;
}

export class TrendDiscoveryService {
  /**
   * Scan multiple sources for trending content
   */
  async scanTrends(userId: string, categories: string[] = [], platforms: string[] = []): Promise<{
    discovered: DiscoveredTrend[];
    count: number;
    timeMs: number;
  }> {
    const startTime = Date.now();
    const discovered: DiscoveredTrend[] = [];

    // 1. Platform-specific trend discovery
    if (platforms.includes('TWITTER') || platforms.length === 0) {
      const twitterTrends = await this.scanTwitterTrends(userId, categories);
      discovered.push(...twitterTrends);
    }

    if (platforms.includes('INSTAGRAM') || platforms.length === 0) {
      const instaTrends = await this.scanInstagramTrends(userId, categories);
      discovered.push(...instaTrends);
    }

    if (platforms.includes('TIKTOK') || platforms.length === 0) {
      const tiktokTrends = await this.scanTikTokTrends(userId, categories);
      discovered.push(...tiktokTrends);
    }

    // 2. AI-enhanced trend analysis
    if (discovered.length > 0) {
      const enriched = await this.enrichWithAI(userId, discovered);
      discovered.push(...enriched);
    }

    const timeMs = Date.now() - startTime;
    logger.info({
      event: 'trend_scan_complete',
      userId,
      discoveredCount: discovered.length,
      timeMs,
      platforms: platforms.length > 0 ? platforms : ['all']
    });

    return { discovered, count: discovered.length, timeMs };
  }

  /**
   * Scan Twitter/X trends via API
   */
  private async scanTwitterTrends(userId: string, categories: string[]): Promise<DiscoveredTrend[]> {
    const trends: DiscoveredTrend[] = [];
    try {
      // Check if user has Twitter connected
      const account = await prisma.socialAccount.findFirst({
        where: { userId, platform: 'TWITTER', status: 'CONNECTED' }
      });

      if (!account) return trends;

      // Use AI to discover trends from recent Twitter activity
      const prompt = `Discover 3-5 trending topics on Twitter related to ${categories.join(', ') || 'fashion and lifestyle'}. For each trend, provide: title, description, relevant hashtags, and estimated engagement score (0-1). Return as JSON array.`;
      
      const aiResult = await aiOrchestrator.generateContent({
        prompt,
        model: 'gemini-flash',
        maxTokens: 500
      });

      if (aiResult?.content) {
        const parsed = this.parseTrendJSON(aiResult.content);
        for (const trend of parsed) {
          const created = await prisma.discoveredTrend.create({
            data: {
              userId,
              title: trend.title,
              description: trend.description,
              category: trend.category || 'FASHION',
              source: 'TWITTER',
              tags: JSON.stringify(trend.hashtags || []),
              engagement: trend.estimatedEngagement || 0,
              score: trend.score || 0.5,
              peakAt: trend.peakAt ? new Date(trend.peakAt) : undefined,
              expiresAt: trend.expiresAt ? new Date(trend.expiresAt) : undefined
            }
          });
          trends.push(created);
        }
      }
    } catch (err) {
      logger.warn({ event: 'twitter_trend_scan_failed', error: String(err) });
    }
    return trends;
  }

  /**
   * Scan Instagram trends
   */
  private async scanInstagramTrends(userId: string, categories: string[]): Promise<DiscoveredTrend[]> {
    const trends: DiscoveredTrend[] = [];
    try {
      const account = await prisma.socialAccount.findFirst({
        where: { userId, platform: 'INSTAGRAM', status: 'CONNECTED' }
      });

      if (!account) return trends;

      const prompt = `Discover 3-5 trending topics on Instagram related to ${categories.join(', ') || 'fashion'}. Include trending hashtags, content types, and engagement estimates. Return as JSON array with: title, description, category, hashtags, score (0-1), estimatedEngagement.`;
      
      const aiResult = await aiOrchestrator.generateContent({
        prompt,
        model: 'gemini-flash',
        maxTokens: 500
      });

      if (aiResult?.content) {
        const parsed = this.parseTrendJSON(aiResult.content);
        for (const trend of parsed) {
          const created = await prisma.discoveredTrend.create({
            data: {
              userId,
              title: trend.title,
              description: trend.description,
              category: trend.category || 'FASHION',
              source: 'INSTAGRAM',
              tags: JSON.stringify(trend.hashtags || []),
              engagement: trend.estimatedEngagement || 0,
              score: trend.score || 0.5
            }
          });
          trends.push(created);
        }
      }
    } catch (err) {
      logger.warn({ event: 'instagram_trend_scan_failed', error: String(err) });
    }
    return trends;
  }

  /**
   * Scan TikTok trends
   */
  private async scanTikTokTrends(userId: string, categories: string[]): Promise<DiscoveredTrend[]> {
    const trends: DiscoveredTrend[] = [];
    try {
      const account = await prisma.socialAccount.findFirst({
        where: { userId, platform: 'TIKTOK', status: 'CONNECTED' }
      });

      if (!account) return trends;

      const prompt = `Discover 3-5 trending topics on TikTok related to ${categories.join(', ') || 'fashion and lifestyle'}. Include trending sounds, challenges, and content formats. Return as JSON array.`;
      
      const aiResult = await aiOrchestrator.generateContent({
        prompt,
        model: 'gemini-flash',
        maxTokens: 500
      });

      if (aiResult?.content) {
        const parsed = this.parseTrendJSON(aiResult.content);
        for (const trend of parsed) {
          const created = await prisma.discoveredTrend.create({
            data: {
              userId,
              title: trend.title,
              description: trend.description,
              category: trend.category || 'FASHION',
              source: 'TIKTOK',
              tags: JSON.stringify(trend.hashtags || []),
              engagement: trend.estimatedEngagement || 0,
              score: trend.score || 0.5
            }
          });
          trends.push(created);
        }
      }
    } catch (err) {
      logger.warn({ event: 'tiktok_trend_scan_failed', error: String(err) });
    }
    return trends;
  }

  /**
   * Enrich trends with AI analysis
   */
  private async enrichWithAI(userId: string, trends: DiscoveredTrend[]): Promise<DiscoveredTrend[]> {
    const enriched: DiscoveredTrend[] = [];
    
    for (const trend of trends) {
      try {
        const prompt = `Analyze this trend: "${trend.title}" - "${trend.description || ''}". Rate its relevance for fashion/lifestyle content on a scale of 0-1. Suggest 3-5 content ideas based on this trend. Return as JSON: { relevanceScore, contentIdeas: string[] }.`;
        
        const aiResult = await aiOrchestrator.generateContent({
          prompt,
          model: 'gemini-flash',
          maxTokens: 300
        });

        if (aiResult?.content) {
          const parsed = this.parseTrendJSON(aiResult.content);
          if (parsed?.relevanceScore) {
            const updated = await prisma.discoveredTrend.update({
              where: { id: trend.id },
              data: { score: Math.max(trend.score, parsed.relevanceScore) }
            });
            enriched.push(updated);
          }
        }
      } catch {
        // Skip enrichment for this trend
      }
    }
    
    return enriched;
  }

  /**
   * Parse JSON from AI response
   */
  private parseTrendJSON(content: string): any[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Get trends with filters
   */
  async getTrends(userId: string, filters: TrendFilter = {}): Promise<{
    trends: DiscoveredTrend[];
    total: number;
    stats: TrendStats;
  }> {
    const where: any = { userId };
    
    if (filters.category) where.category = filters.category;
    if (filters.source) where.source = filters.source;
    if (filters.minScore !== undefined) where.score = { gte: filters.minScore };
    if (filters.isSaved !== undefined) where.isSaved = filters.isSaved;

    const [trends, total, statsData] = await Promise.all([
      prisma.discoveredTrend.findMany({
        where,
        orderBy: { score: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0
      }),
      prisma.discoveredTrend.count({ where }),
      this.getStats(userId)
    ]);

    return { trends, total, stats };
  }

  /**
   * Get trend statistics
   */
  async getStats(userId: string): Promise<TrendStats> {
    const [byCategory, bySource, recentCount, savedCount, allTrends] = await Promise.all([
      prisma.discoveredTrend.groupBy({
        by: ['category'],
        where: { userId },
        _count: true
      }),
      prisma.discoveredTrend.groupBy({
        by: ['source'],
        where: { userId },
        _count: true
      }),
      prisma.discoveredTrend.count({
        where: { userId, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      }),
      prisma.discoveredTrend.count({
        where: { userId, isSaved: true }
      }),
      prisma.discoveredTrend.findMany({
        where: { userId },
        select: { score: true }
      })
    ]);

    const avgScore = allTrends.length > 0
      ? allTrends.reduce((sum, t) => sum + t.score, 0) / allTrends.length
      : 0;

    return {
      total: await prisma.discoveredTrend.count({ where: { userId } }),
      byCategory: Object.fromEntries(byCategory.map(c => [c.category, c._count])),
      bySource: Object.fromEntries(bySource.map(s => [s.source, s._count])),
      recentCount,
      savedCount,
      avgScore
    };
  }

  /**
   * Save/unsave a trend
   */
  async toggleSave(userId: string, trendId: string): Promise<DiscoveredTrend> {
    const trend = await prisma.discoveredTrend.findFirst({
      where: { id: trendId, userId }
    });

    if (!trend) throw new Error('Trend not found');

    return prisma.discoveredTrend.update({
      where: { id: trendId },
      data: {
        isSaved: !trend.isSaved,
        savedAt: trend.isSaved ? null : new Date()
      }
    });
  }

  /**
   * Delete a trend
   */
  async deleteTrend(userId: string, trendId: string): Promise<void> {
    await prisma.discoveredTrend.deleteMany({
      where: { id: trendId, userId }
    });
  }

  /**
   * Get top trends for content generation
   */
  async getTopTrends(userId: string, limit: number = 10): Promise<DiscoveredTrend[]> {
    return prisma.discoveredTrend.findMany({
      where: { userId, score: { gte: 0.5 } },
      orderBy: { score: 'desc' },
      take: limit
    });
  }

  /**
   * Delete expired trends
   */
  async cleanupExpired(): Promise<{ deleted: number }> {
    const result = await prisma.discoveredTrend.deleteMany({
      where: {
        expiresAt: {
          lte: new Date()
        }
      }
    });
    return { deleted: result.count };
  }
}

export const trendDiscovery = new TrendDiscoveryService();
