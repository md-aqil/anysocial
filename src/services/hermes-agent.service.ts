import { prisma } from '../db/prisma.js';
import { postingEngine } from './posting-engine.service.js';
import { aiOrchestrator } from './ai-orchestrator.service.js';
import { logger } from '../logger/pino.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { tokenCrypto } from '../crypto/token-crypto.service.js';
import { oauthService } from '../modules/oauth/oauth.service.js';
import * as cheerio from 'cheerio';

export interface HermesTaskPayload {
  action: string;
  platforms?: string[];
  content?: string;
  title?: string;
  scheduledAt?: string;
  timezone?: string;
  mediaUrls?: string[];
  postType?: string;
  targetRegion?: string;
  niche?: string;
  language?: string;
  voiceId?: string;
  campaignSchedule?: string;
  socialChannels?: string[];
  customPrompt?: string;
  count?: number;
  intervalHours?: number;
  [key: string]: any;
}

export class HermesAgentService {
  private agentId: string;
  private agentName: string;

  constructor() {
    this.agentId = `hermes-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    this.agentName = 'Hermes Autonomous Agent';
  }

  async createTask(userId: string, payload: HermesTaskPayload): Promise<any> {
    const task = await prisma.hermesTask.create({
      data: {
        userId,
        name: payload.customPrompt?.substring(0, 100) || payload.name || `${payload.action} task`,
        description: payload.customPrompt || payload.description || `Execute ${payload.action}`,
        type: payload.action.toUpperCase(),
        status: 'PENDING',
        priority: payload.priority || 'NORMAL',
        payload: payload as any,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : new Date()
      }
    });

    logger.info({
      event: 'hermes_task_created',
      taskId: task.id,
      userId,
      action: payload.action,
      agentId: this.agentId
    });

    return task;
  }

  async getTasks(userId: string, filters?: { status?: string; limit?: number; offset?: number }): Promise<any[]> {
    const where: any = { userId };
    if (filters?.status) {
      where.status = filters.status;
    }

    return prisma.hermesTask.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0
    });
  }

  async getTask(taskId: string, userId: string): Promise<any> {
    const task = await prisma.hermesTask.findFirst({
      where: { id: taskId, userId },
      include: {
        executions: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    return task;
  }

  async cancelTask(taskId: string, userId: string): Promise<any> {
    const task = await prisma.hermesTask.findFirst({
      where: { id: taskId, userId }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status === 'RUNNING') {
      throw new Error('Cannot cancel a running task');
    }

    return prisma.hermesTask.update({
      where: { id: taskId },
      data: {
        status: 'CANCELLED',
        completedAt: new Date()
      }
    });
  }

  async executeTask(taskId: string, userId: string): Promise<any> {
    const task = await prisma.hermesTask.findFirst({
      where: { id: taskId, userId }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.status === 'RUNNING') {
      throw new Error('Task is already running');
    }

    if (task.status === 'COMPLETED') {
      throw new Error('Task already completed');
    }

    if (task.status === 'CANCELLED') {
      throw new Error('Task was cancelled');
    }

    const startTime = Date.now();
    const payload = task.payload as HermesTaskPayload;

    await prisma.hermesTask.update({
      where: { id: taskId },
      data: {
        status: 'RUNNING',
        startedAt: new Date()
      }
    });

    try {
      let result: any = {};

      switch (payload.action) {
        // Content & Publishing
        case 'schedule_post':
          result = await this.executeSchedulePost(userId, payload);
          break;
        case 'generate_content':
          result = await this.executeGenerateContent(userId, payload);
          break;
        case 'bulk_schedule':
          result = await this.executeBulkSchedule(userId, payload);
          break;

        // Campaigns
        case 'create_campaign':
          result = await this.executeCreateCampaign(userId, payload);
          break;
        case 'create_reel_campaign':
          result = await this.executeCreateReelCampaign(userId, payload);
          break;
        case 'create_post_campaign':
          result = await this.executeCreatePostCampaign(userId, payload);
          break;
        case 'list_campaigns':
          result = await this.executeListCampaigns(userId, payload);
          break;
        case 'update_campaign':
          result = await this.executeUpdateCampaign(userId, payload);
          break;
        case 'delete_campaign':
          result = await this.executeDeleteCampaign(userId, payload);
          break;

        // User Management
        case 'list_users':
          result = await this.executeListUsers(userId, payload);
          break;
        case 'create_user':
          result = await this.executeCreateUser(userId, payload);
          break;
        case 'update_user':
          result = await this.executeUpdateUser(userId, payload);
          break;
        case 'delete_user':
          result = await this.executeDeleteUser(userId, payload);
          break;
        case 'change_user_role':
          result = await this.executeChangeUserRole(userId, payload);
          break;

        // Account Management
        case 'list_accounts':
          result = await this.executeListAccounts(userId, payload);
          break;
        case 'disconnect_account':
          result = await this.executeDisconnectAccount(userId, payload);
          break;
        case 'refresh_account':
          result = await this.executeRefreshAccount(userId, payload);
          break;

        // Post Management
        case 'list_posts':
          result = await this.executeListPosts(userId, payload);
          break;
        case 'get_post':
          result = await this.executeGetPost(userId, payload);
          break;
        case 'delete_post':
          result = await this.executeDeletePost(userId, payload);
          break;
        case 'cancel_scheduled_post':
          result = await this.executeCancelScheduledPost(userId, payload);
          break;

        // Reel Management
        case 'list_reels':
          result = await this.executeListReels(userId, payload);
          break;
        case 'delete_reel':
          result = await this.executeDeleteReel(userId, payload);
          break;

        // Analytics
        case 'get_analytics':
          result = await this.executeGetAnalytics(userId, payload);
          break;

        // Notifications
        case 'list_notifications':
          result = await this.executeListNotifications(userId, payload);
          break;

        // Settings
        case 'get_settings':
          result = await this.executeGetSettings(userId, payload);
          break;
        case 'update_settings':
          result = await this.executeUpdateSettings(userId, payload);
          break;

        // Analysis & Health
        case 'analyze_accounts':
          result = await this.executeAnalyzeAccounts(userId, payload);
          break;
        case 'monitor_health':
          result = await this.executeMonitorHealth(userId, payload);
          break;

        // Custom
        case 'custom':
          result = await this.executeCustom(userId, payload);
          break;

        default:
          throw new Error(`Unknown action: ${payload.action}`);
      }

      const duration = Date.now() - startTime;

      await prisma.hermesTask.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          result: result as any,
          completedAt: new Date()
        }
      });

      await this.logExecution(taskId, payload.action, payload, result, 'SUCCESS', duration);

      logger.info({
        event: 'hermes_task_completed',
        taskId,
        action: payload.action,
        duration,
        agentId: this.agentId
      });

      return { success: true, taskId, result, duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;

      await prisma.hermesTask.update({
        where: { id: taskId },
        data: {
          status: 'FAILED',
          error: error.message,
          completedAt: new Date()
        }
      });

      await this.logExecution(taskId, payload.action, payload, null, 'FAILED', duration, error.message);

      logger.error({
        event: 'hermes_task_failed',
        taskId,
        action: payload.action,
        error: error.message,
        duration,
        agentId: this.agentId
      });

      throw error;
    }
  }

  // ==================== CONTENT & PUBLISHING ====================

  private async executeSchedulePost(userId: string, payload: any): Promise<any> {
    if (!payload.content || !payload.platforms || payload.platforms.length === 0) {
      throw new Error('Content and platforms are required for scheduling');
    }

    const result = await postingEngine.schedulePost(userId, {
      content: payload.content,
      title: payload.title,
      media: [],
      platforms: payload.platforms,
      scheduledAt: payload.scheduledAt,
      timezone: payload.timezone || 'UTC',
      platformOptions: payload.platformOptions || {}
    });

    return {
      action: 'post_scheduled',
      postId: result.postId,
      jobIds: result.jobIds,
      status: result.status
    };
  }

  private async executeGenerateContent(userId: string, payload: any): Promise<any> {
    if (!payload.prompt && !payload.customPrompt) {
      throw new Error('Prompt is required for content generation');
    }

    const prompt = payload.prompt || payload.customPrompt;
    const text = await aiOrchestrator.generateContent(prompt, undefined, true);

    return {
      action: 'content_generated',
      text,
      model: 'gemini-2.5-flash'
    };
  }

  private async executeBulkSchedule(userId: string, payload: any): Promise<any> {
    if (!payload.posts || !Array.isArray(payload.posts) || payload.posts.length === 0) {
      throw new Error('Posts array is required for bulk scheduling');
    }

    const results = [];
    for (const postData of payload.posts) {
      try {
        const result = await postingEngine.schedulePost(userId, {
          content: postData.content,
          title: postData.title,
          media: [],
          platforms: postData.platforms || payload.platforms,
          scheduledAt: postData.scheduledAt || payload.scheduledAt,
          timezone: postData.timezone || payload.timezone || 'UTC',
          platformOptions: postData.platformOptions || {}
        });
        results.push({ success: true, postId: result.postId, jobIds: result.jobIds });
      } catch (error: any) {
        results.push({ success: false, error: error.message, content: postData.content?.substring(0, 50) });
      }
    }

    return {
      action: 'bulk_scheduled',
      total: results.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  // ==================== CAMPAIGN MANAGEMENT ====================

  private async executeCreateCampaign(userId: string, payload: any): Promise<any> {
    if (payload.campaignType === 'post' || (payload.productName && !payload.websiteUrl)) {
      return this.executeCreatePostCampaign(userId, payload);
    }
    return this.executeCreateReelCampaign(userId, payload);
  }

  private async executeCreateReelCampaign(userId: string, payload: any): Promise<any> {
    const websiteUrl = payload.websiteUrl || payload.url || 'https://socialsched.vibeship.in';
    const socialChannels = payload.socialChannels || ['INSTAGRAM'];
    const voicePrompt = payload.voicePrompt ? `[MCP] ${payload.voicePrompt}` : '[MCP] Automated Reel Campaign';

    const campaign = await prisma.automatedCampaign.create({
      data: {
        userId,
        websiteUrl,
        schedule: payload.campaignSchedule || 'daily',
        socialChannels: Array.isArray(socialChannels) ? JSON.stringify(socialChannels) : String(socialChannels),
        isActive: payload.isActive !== false,
        language: payload.language || 'English',
        voiceId: payload.voiceId || 'Aoede',
        ingredientsToVideo: payload.ingredientsToVideo || false,
        imageToVideo: payload.imageToVideo || false,
        animateImageCount: payload.animateImageCount || 3,
        voicePrompt
      }
    });

    return {
      action: 'reel_campaign_created',
      campaignId: campaign.id,
      type: 'reel',
      createdVia: 'MCP',
      websiteUrl: campaign.websiteUrl,
      schedule: campaign.schedule,
      socialChannels: campaign.socialChannels
    };
  }

  private async scrapeUrlDetails(url: string): Promise<{ title: string; description: string; images: string[] }> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) return { title: '', description: '', images: [] };
      const html = await response.text();
      const $ = cheerio.load(html);

      const title = $('title').text() || $('meta[property="og:title"]').attr('content') || '';
      const description = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';

      const images: string[] = [];
      const ogImage = $('meta[property="og:image"]').attr('content');
      if (ogImage) images.push(ogImage);

      // Extract JSON-LD product images
      $('script[type="application/ld+json"]').each((_: any, el: any) => {
        try {
          const data = JSON.parse($(el).text());
          const items = Array.isArray(data['@graph']) ? data['@graph'] : [data];
          for (const item of items) {
            if (typeof item.image === 'string' && !images.includes(item.image)) {
              images.push(item.image);
            } else if (Array.isArray(item.image)) {
              item.image.forEach((img: any) => {
                const src = typeof img === 'string' ? img : img?.url;
                if (src && !images.includes(src)) images.push(src);
              });
            } else if (item.image?.url && !images.includes(item.image.url)) {
              images.push(item.image.url);
            }
          }
        } catch (e) {}
      });

      // Extract img tags (filtering out UI icons / badges)
      $('img').each((_: any, el: any) => {
        let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
        if (!src) return;

        if (src.startsWith('//')) src = 'https:' + src;
        else if (src.startsWith('/')) {
          try {
            const urlObj = new URL(url);
            src = `${urlObj.protocol}//${urlObj.host}${src}`;
          } catch (_) {}
        }

        if (src.startsWith('http') && !images.includes(src)) {
          const lowerSrc = src.toLowerCase();
          const isBadgeOrLogo = ['logo', 'icon', 'sprite', 'avatar', 'badge', 'banner', 'button', 'favicon'].some(k => lowerSrc.includes(k));
          if (!isBadgeOrLogo) {
            images.push(src);
          }
        }
      });

      return {
        title: title.trim(),
        description: description.trim(),
        images: images.slice(0, 10)
      };
    } catch (err: any) {
      logger.warn(`Failed to scrape URL ${url}: ${err.message}`);
      return { title: '', description: '', images: [] };
    }
  }

  private async executeCreatePostCampaign(userId: string, payload: any): Promise<any> {
    const targetUrl = payload.websiteUrl || payload.url || payload.link || payload.productUrl;
    let productName = payload.productName;
    let description = payload.description;
    let mediaUrls: string[] = Array.isArray(payload.mediaUrls) ? payload.mediaUrls : (payload.imageUrl ? [payload.imageUrl] : []);

    // Scrape product URL for photos & metadata if URL is provided
    if (targetUrl) {
      const scraped = await this.scrapeUrlDetails(targetUrl);
      if (!productName && scraped.title) productName = scraped.title;
      if (!description && scraped.description) description = scraped.description;
      if (scraped.images.length > 0) {
        mediaUrls = [...new Set([...mediaUrls, ...scraped.images])];
      }
    }

    productName = productName || 'Product Carousel Campaign';
    description = description || `Carousel Post Campaign for ${productName}`;
    const platform = payload.platform || 'INSTAGRAM';
    const campaignId = 'camp_mcp_' + Date.now();

    // Fall back to default logo if no photos extracted
    if (mediaUrls.length === 0) {
      mediaUrls = ['/logo.png'];
    }

    // 4-Slide Storyboard definitions (Slide 1: Cover, Slide 2: Lifestyle, Slide 3: Spotlight, Slide 4: CTA)
    const slideRoles = [
      { index: 1, role: 'cover', title: 'Slide 1 — Hook', caption: `Discover ${productName}` },
      { index: 2, role: 'lifestyle', title: 'Slide 2 — Lifestyle Action', caption: `Experience ${productName} in real life` },
      { index: 3, role: 'detail', title: 'Slide 3 — Spotlight Detail', caption: `Intricate design & premium quality` },
      { index: 4, role: 'cta', title: 'Slide 4 — Shop Now End-Card', caption: `Limited Batch — Tap link in bio to shop` },
    ];

    const createdCreatives = [];

    for (let i = 0; i < slideRoles.length; i++) {
      const slideDef = slideRoles[i];
      // Rotate extracted images from link across all 4 carousel slides!
      const slideImage = mediaUrls[i % mediaUrls.length];

      const brief = {
        campaignId,
        productName,
        platform,
        description,
        usp: payload.usp || '',
        personality: payload.personality || '',
        audience: payload.audience || '',
        mood: payload.mood || 'Festive Studio',
        specialInstructions: payload.specialInstructions || '',
        campaignConcept: `MCP Carousel Campaign for ${productName}`,
        tagline: slideDef.caption,
        createdVia: 'MCP',
        isMcp: true,
        referenceImageUrl: slideImage,
        mediaUrls,
        carousel: {
          campaignId,
          slideIndex: slideDef.index,
          slideCount: 4,
          slideTitle: slideDef.title,
          role: slideDef.role,
          caption: slideDef.caption,
        }
      };

      const creative = await prisma.adCreative.create({
        data: {
          userId,
          productName,
          platform,
          direction: slideDef.title,
          brief: brief as any,
          imageUrl: slideImage
        }
      });

      createdCreatives.push({
        id: creative.id,
        slideIndex: slideDef.index,
        title: slideDef.title,
        imageUrl: slideImage
      });
    }

    return {
      action: 'post_campaign_created',
      campaignId,
      type: 'post',
      createdVia: 'MCP',
      productName,
      platform,
      totalSlides: createdCreatives.length,
      scrapedImagesCount: mediaUrls.length,
      mediaUrls,
      slides: createdCreatives
    };
  }

  private async executeListCampaigns(userId: string, payload: any): Promise<any> {
    const where: any = { userId };
    if (payload.isActive !== undefined) {
      where.isActive = payload.isActive;
    }

    const campaigns = await prisma.automatedCampaign.findMany({
      where,
      include: {
        products: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      action: 'campaigns_listed',
      total: campaigns.length,
      campaigns
    };
  }

  private async executeUpdateCampaign(userId: string, payload: any): Promise<any> {
    if (!payload.campaignId) {
      throw new Error('campaignId is required');
    }

    const campaign = await prisma.automatedCampaign.findFirst({
      where: { id: payload.campaignId, userId }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const updated = await prisma.automatedCampaign.update({
      where: { id: payload.campaignId },
      data: {
        ...(payload.websiteUrl && { websiteUrl: payload.websiteUrl }),
        ...(payload.schedule && { schedule: payload.schedule }),
        ...(payload.socialChannels && { socialChannels: payload.socialChannels }),
        ...(payload.isActive !== undefined && { isActive: payload.isActive }),
        ...(payload.language && { language: payload.language }),
        ...(payload.voiceId && { voiceId: payload.voiceId }),
        ...(payload.voicePrompt !== undefined && { voicePrompt: payload.voicePrompt }),
        ...(payload.ingredientsToVideo !== undefined && { ingredientsToVideo: payload.ingredientsToVideo }),
        ...(payload.imageToVideo !== undefined && { imageToVideo: payload.imageToVideo }),
        ...(payload.animateImageCount !== undefined && { animateImageCount: payload.animateImageCount })
      }
    });

    return {
      action: 'campaign_updated',
      campaignId: updated.id,
      websiteUrl: updated.websiteUrl
    };
  }

  private async executeDeleteCampaign(userId: string, payload: any): Promise<any> {
    if (!payload.campaignId) {
      throw new Error('campaignId is required');
    }

    const campaign = await prisma.automatedCampaign.findFirst({
      where: { id: payload.campaignId, userId }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    await prisma.automatedCampaign.delete({
      where: { id: payload.campaignId }
    });

    return {
      action: 'campaign_deleted',
      campaignId: payload.campaignId
    };
  }

  // ==================== USER MANAGEMENT ====================

  private async executeListUsers(_userId: string, _payload: any): Promise<any> {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        socialAccounts: {
          select: {
            id: true,
            platform: true,
            status: true,
            externalAccountId: true
          }
        },
        _count: {
          select: {
            posts: true,
            socialAccounts: true
          }
        }
      }
    });

    return {
      action: 'users_listed',
      total: users.length,
      users
    };
  }

  private async executeCreateUser(_userId: string, payload: any): Promise<any> {
    if (!payload.email || !payload.password) {
      throw new Error('Email and password are required');
    }

    const existing = await prisma.user.findUnique({ where: { email: payload.email } });
    if (existing) {
      throw new Error('User already exists');
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);

    const user = await prisma.user.create({
      data: {
        email: payload.email,
        passwordHash,
        name: payload.name || null,
        role: payload.role || 'user'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    return {
      action: 'user_created',
      userId: user.id,
      email: user.email,
      role: user.role
    };
  }

  private async executeUpdateUser(_userId: string, payload: any): Promise<any> {
    if (!payload.targetUserId) {
      throw new Error('targetUserId is required');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.targetUserId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const updated = await prisma.user.update({
      where: { id: payload.targetUserId },
      data: {
        ...(payload.name !== undefined && { name: payload.name }),
        ...(payload.role && { role: payload.role }),
        ...(payload.password && { passwordHash: await bcrypt.hash(payload.password, 12) })
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    return {
      action: 'user_updated',
      userId: updated.id,
      email: updated.email,
      role: updated.role
    };
  }

  private async executeDeleteUser(_userId: string, payload: any): Promise<any> {
    if (!payload.targetUserId) {
      throw new Error('targetUserId is required');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.targetUserId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    await prisma.user.delete({
      where: { id: payload.targetUserId }
    });

    return {
      action: 'user_deleted',
      userId: payload.targetUserId,
      email: user.email
    };
  }

  private async executeChangeUserRole(_userId: string, payload: any): Promise<any> {
    if (!payload.targetUserId || !payload.role) {
      throw new Error('targetUserId and role are required');
    }

    const validRoles = ['user', 'admin', 'super_admin'];
    if (!validRoles.includes(payload.role)) {
      throw new Error(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.targetUserId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const updated = await prisma.user.update({
      where: { id: payload.targetUserId },
      data: { role: payload.role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      }
    });

    return {
      action: 'user_role_changed',
      userId: updated.id,
      email: updated.email,
      newRole: updated.role
    };
  }

  // ==================== ACCOUNT MANAGEMENT ====================

  private async executeListAccounts(userId: string, _payload: any): Promise<any> {
    const accounts = await prisma.socialAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        platform: true,
        externalAccountId: true,
        status: true,
        tokenExpiry: true,
        lastRefreshed: true,
        createdAt: true,
        metadata: true
      }
    });

    return {
      action: 'accounts_listed',
      total: accounts.length,
      accounts
    };
  }

  private async executeDisconnectAccount(userId: string, payload: any): Promise<any> {
    if (!payload.accountId) {
      throw new Error('accountId is required');
    }

    const account = await prisma.socialAccount.findFirst({
      where: { id: payload.accountId, userId }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    await prisma.socialAccount.delete({
      where: { id: payload.accountId }
    });

    return {
      action: 'account_disconnected',
      accountId: payload.accountId,
      platform: account.platform
    };
  }

  private async executeRefreshAccount(userId: string, payload: any): Promise<any> {
    if (!payload.accountId) {
      throw new Error('accountId is required');
    }

    const account = await prisma.socialAccount.findFirst({
      where: { id: payload.accountId, userId }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const result = await oauthService.refreshToken(payload.accountId);

    return {
      action: 'account_refreshed',
      accountId: payload.accountId,
      platform: account.platform,
      success: result
    };
  }

  // ==================== POST MANAGEMENT ====================

  private async executeListPosts(userId: string, payload: any): Promise<any> {
    const where: any = { userId };
    if (payload.status) {
      where.status = payload.status;
    }
    if (payload.platform) {
      where.platforms = { has: payload.platform };
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: payload.limit || 50,
      skip: payload.offset || 0,
      include: {
        media: true
      }
    });

    return {
      action: 'posts_listed',
      total: posts.length,
      posts
    };
  }

  private async executeGetPost(userId: string, payload: any): Promise<any> {
    if (!payload.postId) {
      throw new Error('postId is required');
    }

    const post = await prisma.post.findFirst({
      where: { id: payload.postId, userId },
      include: {
        media: true,
        analytics: true
      }
    });

    if (!post) {
      throw new Error('Post not found');
    }

    return {
      action: 'post_retrieved',
      post
    };
  }

  private async executeDeletePost(userId: string, payload: any): Promise<any> {
    if (!payload.postId) {
      throw new Error('postId is required');
    }

    const post = await prisma.post.findFirst({
      where: { id: payload.postId, userId }
    });

    if (!post) {
      throw new Error('Post not found');
    }

    await postingEngine.deletePost(payload.postId, userId);

    return {
      action: 'post_deleted',
      postId: payload.postId
    };
  }

  private async executeCancelScheduledPost(userId: string, payload: any): Promise<any> {
    if (!payload.postId) {
      throw new Error('postId is required');
    }

    const post = await prisma.post.findFirst({
      where: { id: payload.postId, userId }
    });

    if (!post) {
      throw new Error('Post not found');
    }

    if (!['QUEUED', 'PROCESSING'].includes(post.status)) {
      throw new Error('Only queued or processing posts can be cancelled');
    }

    const updated = await prisma.post.update({
      where: { id: payload.postId },
      data: { status: 'CANCELLED' }
    });

    return {
      action: 'scheduled_post_cancelled',
      postId: payload.postId,
      status: updated.status
    };
  }

  // ==================== REEL MANAGEMENT ====================

  private async executeListReels(userId: string, payload: any): Promise<any> {
    const where: any = { userId };
    if (payload.status) {
      where.status = payload.status;
    }

    const reels = await prisma.reel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: payload.limit || 50,
      include: {
        series: true,
        post: true
      }
    });

    return {
      action: 'reels_listed',
      total: reels.length,
      reels
    };
  }

  private async executeDeleteReel(userId: string, payload: any): Promise<any> {
    if (!payload.reelId) {
      throw new Error('reelId is required');
    }

    const reel = await prisma.reel.findFirst({
      where: { id: payload.reelId, userId }
    });

    if (!reel) {
      throw new Error('Reel not found');
    }

    await prisma.reel.delete({
      where: { id: payload.reelId }
    });

    return {
      action: 'reel_deleted',
      reelId: payload.reelId
    };
  }

  // ==================== ANALYTICS ====================

  private async executeGetAnalytics(userId: string, payload: any): Promise<any> {
    const days = payload.days || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const posts = await prisma.post.findMany({
      where: {
        userId,
        publishedAt: {
          gte: startDate
        }
      },
      include: {
        analytics: true
      }
    });

    const stats = {
      totalPosts: posts.length,
      published: posts.filter(p => p.status === 'PUBLISHED').length,
      failed: posts.filter(p => p.status === 'FAILED').length,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      totalReach: 0
    };

    for (const post of posts) {
      for (const analytic of post.analytics) {
        const metrics = analytic.metrics as any || {};
        stats.totalLikes += metrics.likes || 0;
        stats.totalComments += metrics.comments || 0;
        stats.totalShares += metrics.shares || 0;
        stats.totalReach += metrics.reach || 0;
      }
    }

    return {
      action: 'analytics_retrieved',
      period: `Last ${days} days`,
      stats,
      topPosts: posts.slice(0, 10)
    };
  }

  // ==================== NOTIFICATIONS ====================

  private async executeListNotifications(userId: string, payload: any): Promise<any> {
    const where: any = { userId };
    if (payload.isRead !== undefined) {
      where.isRead = payload.isRead;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: payload.limit || 50
    });

    return {
      action: 'notifications_listed',
      total: notifications.length,
      notifications
    };
  }

  // ==================== SETTINGS ====================

  private async executeGetSettings(_userId: string, _payload: any): Promise<any> {
    const settings = await prisma.appSetting.findMany({
      select: {
        key: true,
        value: true,
        updatedAt: true
      }
    });

    return {
      action: 'settings_retrieved',
      settings: settings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {} as Record<string, any>)
    };
  }

  private async executeUpdateSettings(_userId: string, payload: any): Promise<any> {
    if (!payload.settings || typeof payload.settings !== 'object') {
      throw new Error('settings object is required');
    }

    const results = [];
    for (const [key, value] of Object.entries(payload.settings)) {
      const setting = await prisma.appSetting.upsert({
        where: { key },
        update: { value: value as any },
        create: { key, value: value as any }
      });
      results.push({ key: setting.key, value: setting.value });
    }

    return {
      action: 'settings_updated',
      updatedKeys: results.map(r => r.key)
    };
  }

  // ==================== ANALYSIS & HEALTH ====================

  private async executeAnalyzeAccounts(userId: string, _payload: any): Promise<any> {
    const accounts = await prisma.socialAccount.findMany({
      where: { userId, status: 'CONNECTED' },
      select: {
        id: true,
        platform: true,
        status: true,
        tokenExpiry: true,
        lastRefreshed: true,
        createdAt: true
      }
    });

    const now = new Date();
    const analysis = accounts.map(acc => {
      const isExpired = acc.tokenExpiry ? new Date(acc.tokenExpiry) < now : true;
      const daysSinceRefresh = acc.lastRefreshed 
        ? Math.floor((now.getTime() - new Date(acc.lastRefreshed).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: acc.id,
        platform: acc.platform,
        status: acc.status,
        isExpired,
        daysSinceRefresh,
        health: isExpired ? 'NEEDS_REFRESH' : 'HEALTHY'
      };
    });

    return {
      action: 'accounts_analyzed',
      totalAccounts: accounts.length,
      healthy: analysis.filter(a => a.health === 'HEALTHY').length,
      needsRefresh: analysis.filter(a => a.health === 'NEEDS_REFRESH').length,
      accounts: analysis
    };
  }

  private async executeMonitorHealth(userId: string, _payload: any): Promise<any> {
    const posts = await prisma.post.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        platforms: true,
        scheduledAt: true,
        publishedAt: true,
        createdAt: true,
        platformResults: true
      }
    });

    const stats = {
      total: posts.length,
      published: posts.filter(p => p.status === 'PUBLISHED').length,
      failed: posts.filter(p => p.status === 'FAILED').length,
      queued: posts.filter(p => p.status === 'QUEUED').length,
      draft: posts.filter(p => p.status === 'DRAFT').length,
      processing: posts.filter(p => p.status === 'PROCESSING').length
    };

    return {
      action: 'health_monitored',
      postsStats: stats,
      recentPosts: posts.slice(0, 5)
    };
  }

  // ==================== CUSTOM ====================

  private async executeCustom(userId: string, payload: any): Promise<any> {
    if (!payload.prompt) {
      throw new Error('Prompt is required for custom execution');
    }

    const text = await aiOrchestrator.generateContent(
      `You are Hermes, an autonomous social media management agent. Execute the following task:\n\n${payload.prompt}\n\nReturn a JSON object with your results.`,
      undefined,
      true
    );

    return {
      action: 'custom_executed',
      prompt: payload.prompt,
      result: text,
      timestamp: new Date().toISOString()
    };
  }

  // ==================== LOGGING ====================

  private async logExecution(
    taskId: string,
    action: string,
    input: any,
    output: any,
    status: 'SUCCESS' | 'FAILED' | 'RETRYING',
    duration: number,
    error?: string
  ): Promise<void> {
    await prisma.hermesExecution.create({
      data: {
        taskId,
        agentId: this.agentId,
        agentName: this.agentName,
        action,
        input,
        output,
        status,
        duration,
        error
      }
    });
  }

  async getExecutions(taskId: string, userId: string): Promise<any[]> {
    const task = await prisma.hermesTask.findFirst({
      where: { id: taskId, userId }
    });

    if (!task) {
      throw new Error('Task not found');
    }

    return prisma.hermesExecution.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
  }

  async getAgentStatus(): Promise<any> {
    const totalTasks = await prisma.hermesTask.count();
    const pendingTasks = await prisma.hermesTask.count({ where: { status: 'PENDING' } });
    const runningTasks = await prisma.hermesTask.count({ where: { status: 'RUNNING' } });
    const completedTasks = await prisma.hermesTask.count({ where: { status: 'COMPLETED' } });
    const failedTasks = await prisma.hermesTask.count({ where: { status: 'FAILED' } });

    return {
      agentId: this.agentId,
      agentName: this.agentName,
      status: 'ONLINE',
      uptime: process.uptime(),
      stats: {
        total: totalTasks,
        pending: pendingTasks,
        running: runningTasks,
        completed: completedTasks,
        failed: failedTasks
      }
    };
  }
}

export const hermesAgent = new HermesAgentService();
