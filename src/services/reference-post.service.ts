import { prisma } from '../db/prisma.js';
import { logger } from '../logger/pino.js';
import { aiOrchestrator } from './ai-orchestrator.service.js';
import type { ReferencePost } from '@prisma/client';

export interface ReferencePostInput {
  title: string;
  url: string;
  platform: string;
  contentType?: string;
  caption?: string;
  hashtags?: string[];
  mood?: string;
  aesthetic?: string;
  notes?: string;
}

export interface StyleAnalysis {
  tone: string[];
  hashtags: string[];
  structure: string;
  visualStyle: string[];
  postingTime: string;
  engagement: Record<string, number>;
}

export class ReferencePostService {
  /**
   * Create a reference post
   */
  async create(userId: string, input: ReferencePostInput): Promise<ReferencePost> {
    const post = await prisma.referencePost.create({
      data: {
        userId,
        title: input.title,
        url: input.url,
        platform: input.platform,
        contentType: input.contentType || 'POST',
        caption: input.caption,
        hashtags: JSON.stringify(input.hashtags || []),
        mood: input.mood,
        aesthetic: input.aesthetic,
        notes: input.notes
      }
    });

    // Extract style tags from caption if provided
    if (input.caption) {
      const styleTags = await this.extractStyleTags(userId, post.id, input.caption);
      if (styleTags.length > 0) {
        await prisma.referencePost.update({
          where: { id: post.id },
          data: { styleTags: JSON.stringify(styleTags) }
        });
      }
    }

    logger.info({ event: 'reference_post_created', postId: post.id, platform: input.platform });
    return post;
  }

  /**
   * Get reference posts with filters
   */
  async getPosts(userId: string, filters: {
    platform?: string;
    isFavorite?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ posts: ReferencePost[]; total: number }> {
    const where: any = { userId };
    if (filters.platform) where.platform = filters.platform;
    if (filters.isFavorite !== undefined) where.isFavorite = filters.isFavorite;

    const [posts, total] = await Promise.all([
      prisma.referencePost.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0
      }),
      prisma.referencePost.count({ where })
    ]);

    return { posts, total };
  }

  /**
   * Get a single reference post
   */
  async getPost(userId: string, postId: string): Promise<ReferencePost | null> {
    return prisma.referencePost.findFirst({
      where: { id: postId, userId }
    });
  }

  /**
   * Update a reference post
   */
  async update(userId: string, postId: string, updates: Partial<ReferencePostInput>): Promise<ReferencePost> {
    const data: any = {
      title: updates.title,
      url: updates.url,
      platform: updates.platform,
      contentType: updates.contentType,
      caption: updates.caption,
      mood: updates.mood,
      aesthetic: updates.aesthetic,
      notes: updates.notes
    };

    if (updates.hashtags) {
      data.hashtags = JSON.stringify(updates.hashtags);
    }

    return prisma.referencePost.update({
      where: { id: postId, userId },
      data
    });
  }

  /**
   * Delete a reference post
   */
  async delete(userId: string, postId: string): Promise<void> {
    await prisma.referencePost.deleteMany({
      where: { id: postId, userId }
    });
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(userId: string, postId: string): Promise<ReferencePost> {
    return prisma.referencePost.update({
      where: { id: postId, userId },
      data: { isFavorite: { not: true } }
    });
  }

  /**
   * Extract style tags from caption using AI
   */
  private async extractStyleTags(userId: string, postId: string, caption: string): Promise<string[]> {
    try {
      const prompt = `Analyze this social media caption and extract style descriptors: "${caption}". Return up to 10 tags describing the tone, style, mood, and aesthetic. Return as JSON array of strings.`;
      
      const result = await aiOrchestrator.generateContent({
        prompt,
        model: 'gemini-flash',
        maxTokens: 200
      });

      if (result?.content) {
        const tags = this.parseStringArray(result.content);
        return tags.slice(0, 10);
      }
    } catch (err) {
      logger.warn({ event: 'style_tag_extraction_failed', error: String(err) });
    }
    return [];
  }

  /**
   * Parse string array from AI response
   */
  private parseStringArray(content: string): string[] {
    try {
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          return parsed.filter((item: any) => typeof item === 'string');
        }
      }
      // Fallback: split by commas
      return content.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10);
    } catch {
      return [];
    }
  }

  /**
   * Analyze style from a reference post
   */
  async analyzeStyle(userId: string, postId: string): Promise<StyleAnalysis> {
    const post = await this.getPost(userId, postId);
    if (!post) throw new Error('Reference post not found');

    try {
      const prompt = `Analyze the style of this social media post:
Title: ${post.title}
Platform: ${post.platform}
Caption: ${post.caption || 'N/A'}
Hashtags: ${post.hashtags}
Mood: ${post.mood || 'N/A'}
Aesthetic: ${post.aesthetic || 'N/A'}

Provide a detailed style analysis in JSON format with: tone (array of strings), hashtags (array), structure (string description), visualStyle (array), postingTime (string), engagement (object with likes, comments, shares, views).`;

      const result = await aiOrchestrator.generateContent({
        prompt,
        model: 'gemini-pro',
        maxTokens: 500
      });

      if (result?.content) {
        const analysis = this.parseJSON(result.content);
        if (analysis) return analysis as StyleAnalysis;
      }
    } catch (err) {
      logger.warn({ event: 'style_analysis_failed', postId, error: String(err) });
    }

    // Return default analysis
    return {
      tone: [post.mood || 'Professional', post.aesthetic || 'Clean'],
      hashtags: this.parseStringArray(post.hashtags),
      structure: 'Standard social media post',
      visualStyle: [post.aesthetic || 'Modern'],
      postingTime: 'Peak engagement time',
      engagement: {}
    };
  }

  /**
   * Get similar reference posts based on style
   */
  async getSimilarPosts(userId: string, postId: string, limit: number = 5): Promise<ReferencePost[]> {
    const post = await this.getPost(userId, postId);
    if (!post) return [];

    const targetStyle = this.parseStringArray(post.styleTags);
    
    const allPosts = await prisma.referencePost.findMany({
      where: { userId, id: { not: postId } }
    });

    // Simple similarity scoring based on shared tags
    const scored = allPosts.map(p => {
      const pTags = this.parseStringArray(p.styleTags);
      const overlap = targetStyle.filter(t => pTags.includes(t)).length;
      return { post: p, score: overlap };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.post);
  }

  /**
   * Parse JSON from AI response
   */
  private parseJSON(content: string): any {
    try {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Get reference post statistics
   */
  async getStats(userId: string): Promise<{
    total: number;
    byPlatform: Record<string, number>;
    favoriteCount: number;
    recentCount: number;
  }> {
    const [byPlatform, favoriteCount, recentCount] = await Promise.all([
      prisma.referencePost.groupBy({
        by: ['platform'],
        where: { userId },
        _count: true
      }),
      prisma.referencePost.count({
        where: { userId, isFavorite: true }
      }),
      prisma.referencePost.count({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      })
    ]);

    return {
      total: await prisma.referencePost.count({ where: { userId } }),
      byPlatform: Object.fromEntries(byPlatform.map(p => [p.platform, p._count])),
      favoriteCount,
      recentCount
    };
  }
}

export const referencePostService = new ReferencePostService();
