/**
 * Company Reel Scheduler
 * ──────────────────────────────────────────────────────────────────────
 * Cron worker that runs hourly and checks all active CompanyKnowledgeBase
 * records. If the next scheduled time falls within the next 65 minutes,
 * it creates a CompanyReel record and queues generation.
 */

import cron from 'node-cron';
import { prisma } from '../db/prisma.js';
import { logger } from '../logger/pino.js';
import { companyReelQueue } from '../queues/company-reel-queue.js';
import { getNextScheduledDate } from '../services/reel-scheduler.service.js';

export const companyReelScheduler = {
  start() {
    logger.info('Starting Company Reel Scheduler...');
    // Run every hour
    cron.schedule('5 * * * *', async () => {
      logger.info('Company Reel Scheduler: Running hourly check...');
      await this.checkAndSchedule();
    });
  },

  async checkAndSchedule() {
    try {
      const activeKBs = await prisma.companyKnowledgeBase.findMany({
        where: { isActive: true },
      });

      const now = new Date();
      const lookAheadTime = new Date(now.getTime() + 65 * 60 * 1000);

      for (const kb of activeKBs) {
        try {
          const scheduleDays: string[] = JSON.parse(kb.scheduleDays || '[]');
          if (scheduleDays.length === 0 || !kb.scheduleTime) continue;

          const nextDate = getNextScheduledDate(
            kb.scheduleDays,
            kb.scheduleTime,
            kb.timezoneOffset ?? undefined
          );

          if (nextDate >= now && nextDate <= lookAheadTime) {
            await this.triggerReelGeneration(kb.id, nextDate);
          }
        } catch (err: any) {
          logger.error({ event: 'company_reel_scheduler_error', kbId: kb.id, error: err.message });
        }
      }
    } catch (error: any) {
      logger.error({ event: 'company_reel_scheduler_global_error', error: error.message });
    }
  },

  async triggerReelGeneration(kbId: string, scheduledFor?: Date): Promise<any> {
    const kb = await prisma.companyKnowledgeBase.findUniqueOrThrow({ where: { id: kbId } });

    // Create the CompanyReel record
    const companyReel = await prisma.companyReel.create({
      data: {
        userId: kb.userId,
        kbId: kb.id,
        topic: '', // Will be filled by worker after topic selection
        status: 'PENDING',
        scheduledFor: scheduledFor || new Date(),
        socialChannels: kb.socialChannels,
        metadata: { kbId, companyName: kb.companyName }
      }
    });

    // Queue the generation job
    await companyReelQueue.add(
      'generate-company-reel',
      { kbId, companyReelId: companyReel.id },
      { jobId: `company-reel-${companyReel.id}` }
    );

    logger.info({ event: 'company_reel_scheduled', kbId, companyReelId: companyReel.id });
    return companyReel;
  }
};
