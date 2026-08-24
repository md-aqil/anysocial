import { prisma } from '../db/prisma.js';
import { logger } from '../logger/pino.js';
import { trendDiscovery } from '../services/trend-discovery.service.js';
import { referencePostService } from '../services/reference-post.service.js';
import { aiOrchestrator } from '../services/ai-orchestrator.service.js';
import { postingEngine } from '../services/posting-engine.service.js';

export interface AutonomousTask {
  type: 'SCAN_TRENDS' | 'GENERATE_CONTENT' | 'SCHEDULE_POST' | 'ANALYZE_REFERENCE';
  userId: string;
  payload: any;
}

export class AutonomousContentWorker {
  private isRunning = false;
  private intervalMs = 3600000; // Default: 1 hour
  private lastRun: number = 0;

  /**
   * Start the autonomous worker
   */
  async start(userId: string): Promise<void> {
    if (this.isRunning) {
      logger.info({ event: 'autonomous_worker_already_running', userId });
      return;
    }

    this.isRunning = true;
    logger.info({ event: 'autonomous_worker_started', userId });

    // Run immediate scan
    await this.runCycle(userId);

    // Schedule periodic runs
    const config = await prisma.autonomousConfig.findUnique({
      where: { userId }
    });

    if (config) {
      this.intervalMs = this.getIntervalMs(config.scanFrequency);
    }

    const interval = setInterval(() => {
      this.runCycle(userId).catch(err => {
        logger.error({ event: 'autonomous_cycle_error', userId, error: String(err) });
      });
    }, this.intervalMs);

    // Store interval for cleanup
    (this as any).interval = interval;
  }

  /**
   * Stop the autonomous worker
   */
  async stop(userId: string): Promise<void> {
    this.isRunning = false;
    if ((this as any).interval) {
      clearInterval((this as any).interval);
      (this as any).interval = null;
    }
    logger.info({ event: 'autonomous_worker_stopped', userId });
  }

  /**
   * Run one complete autonomous cycle
   */
  async runCycle(userId: string): Promise<{
    trendsDiscovered: number;
    contentGenerated: number;
    postsScheduled: number;
    errors: string[];
  }> {
    const result = {
      trendsDiscovered: 0,
      contentGenerated: 0,
      postsScheduled: 0,
      errors: [] as string[]
    };

    try {
      const config = await this.getConfig(userId);
      if (!config || !config.isEnabled) {
        logger.debug({ event: 'autonomous_disabled', userId });
        return result;
      }

      // Get reference posts for style learning
      const referencePosts = await this.getReferencePosts(userId, config);
      
      // Step 1: Scan trends
      const platforms = this.parseStringArray(config.platforms);
      const categories = this.parseStringArray(config.trendCategories);
      
      const scanResult = await trendDiscovery.scanTrends(userId, categories, platforms);
      result.trendsDiscovered = scanResult.count;

      // Step 2: Generate content from top trends
      if (config.autoGenerate && scanResult.count > 0) {
        const topTrends = await trendDiscovery.getTopTrends(userId, 5);
        const generated = await this.generateContentFromTrends(userId, topTrends, referencePosts, config);
        result.contentGenerated = generated;
      }

      // Step 3: Auto-schedule if enabled
      if (config.autoSchedule) {
        const scheduled = await this.autoSchedulePosts(userId, config);
        result.postsScheduled = scheduled;
      }

    } catch (err) {
      result.errors.push(String(err));
      logger.error({ event: 'autonomous_cycle_error', userId, error: String(err) });
    }

    return result;
  }

  /**
   * Generate content from discovered trends
   */
  private async generateContentFromTrends(
    userId: string,
    trends: any[],
    referencePosts: any[],
    config: any
  ): Promise<number> {
    let generated = 0;
    const maxPostsPerDay = config.maxPostsPerDay || 3;

    for (const trend of trends.slice(0, maxPostsPerDay)) {
      try {
        // Generate content based on trend and reference style
        const content = await this.generateContentForTrend(userId, trend, referencePosts, config);
        if (content) {
          // Create a scheduled post
          const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
          
          await prisma.hermesTask.create({
            data: {
              userId,
              name: `Auto-generated: ${trend.title}`,
              description: `Content generated from trend: ${trend.title}`,
              type: 'GENERATE_CONTENT',
              status: 'PENDING',
              priority: 'NORMAL',
              payload: {
                trendId: trend.id,
                trendTitle: trend.title,
                content,
                platforms: this.parseStringArray(config.platforms),
                voiceId: config.voiceId,
                scheduledAt: scheduledAt.toISOString()
              },
              scheduledAt
            }
          });
          generated++;
        }
      } catch (err) {
        logger.warn({ event: 'content_generation_failed', trendId: trend.id, error: String(err) });
      }
    }

    return generated;
  }

  /**
   * Generate content for a single trend
   */
  private async generateContentForTrend(
    userId: string,
    trend: any,
    referencePosts: any[],
    config: any
  ): Promise<string | null> {
    try {
      const styleContext = referencePosts.length > 0
        ? `Learn from these reference posts: ${referencePosts.map((p: any) => p.caption || p.title).join('; ')}`
        : '';

      const prompt = `Create engaging social media content about this trending topic:
Title: ${trend.title}
Description: ${trend.description || 'N/A'}
Category: ${trend.category}
Tags: ${trend.tags}

${styleContext}

Brand tone: ${config.brandTone || 'Professional'}
Language: ${config.language || 'English'}
Niche: ${config.niche || 'Fashion'}

Generate a caption that is:
- Engaging and on-trend
- Matches the brand tone
- Includes relevant hashtags
- Has a clear call-to-action

Return ONLY the caption text, no explanations.`;

      const result = await aiOrchestrator.generateContent({
        prompt,
        model: 'gemini-flash',
        maxTokens: 300
      });

      return result?.content?.trim() || null;
    } catch (err) {
      logger.error({ event: 'content_generation_error', error: String(err) });
      return null;
    }
  }

  /**
   * Auto-schedule posts from pending tasks
   */
  private async autoSchedulePosts(userId: string, config: any): Promise<number> {
    const pendingTasks = await prisma.hermesTask.findMany({
      where: {
        userId,
        status: 'PENDING',
        type: { in: ['GENERATE_CONTENT', 'SCHEDULE_POST'] }
      },
      take: config.maxPostsPerDay || 3
    });

    let scheduled = 0;
    for (const task of pendingTasks) {
      try {
        await postingEngine.schedulePost(userId, task.payload as any);
        scheduled++;
      } catch (err) {
        logger.warn({ event: 'auto_schedule_failed', taskId: task.id, error: String(err) });
      }
    }

    return scheduled;
  }

  /**
   * Get autonomous config for user
   */
  private async getConfig(userId: string): Promise<any> {
    return prisma.autonomousConfig.findUnique({
      where: { userId }
    });
  }

  /**
   * Get reference posts for user
   */
  private async getReferencePosts(userId: string, config: any): Promise<any[]> {
    const ids = this.parseStringArray(config.referencePostIds);
    if (ids.length === 0) return [];

    return prisma.referencePost.findMany({
      where: {
        userId,
        id: { in: ids }
      }
    });
  }

  /**
   * Get interval milliseconds from frequency string
   */
  private getIntervalMs(frequency: string): number {
    switch (frequency) {
      case 'minute': return 60000;
      case 'hourly': return 3600000;
      case 'daily': return 86400000;
      default: return 3600000;
    }
  }

  /**
   * Parse JSON string array
   */
  private parseStringArray(value: string | null | undefined): string[] {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Check if worker is running
   */
  isWorkerRunning(userId: string): boolean {
    return this.isRunning;
  }
}

export const autonomousWorker = new AutonomousContentWorker();
