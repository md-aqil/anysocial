import { prisma } from '../db/prisma.js';
import { reelGenerationQueue } from '../queues/reel-queue.js';
import { logger } from '../logger/pino.js';

/**
 * Calculate the next scheduled date/time based on scheduleDays and scheduleTime
 */
export function getNextScheduledDate(scheduleDaysStr: string, scheduleTimeStr: string, timezoneOffset?: number): Date {
  const now = new Date();
  
  let days: string[] = [];
  try {
    days = JSON.parse(scheduleDaysStr || '[]');
  } catch {
    days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  }
  if (!Array.isArray(days) || days.length === 0) {
    days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  }

  const timeStr = scheduleTimeStr || '12:00';
  const [hours, minutes] = timeStr.split(':').map(Number);

  const dayMap: Record<string, number> = {
    'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6
  };
  const targetDayNumbers = days.map(d => dayMap[d.toUpperCase()]).filter(n => n !== undefined);

  // User's timezone offset in minutes (JS format: positive if behind UTC, negative if ahead of UTC)
  // If not provided, fallback to server's offset
  const offsetMs = timezoneOffset !== undefined ? timezoneOffset * 60 * 1000 : now.getTimezoneOffset() * 60 * 1000;
  
  // Calculate what "now" is in the user's local timezone
  const userNow = new Date(now.getTime() - offsetMs);
  
  let candidateUser = new Date(userNow.getTime());
  // Set hours/minutes using UTC methods so we strictly manipulate the user's local date/time 
  // without server timezone interference.
  candidateUser.setUTCHours(hours, minutes, 0, 0);

  if (candidateUser <= userNow) {
    candidateUser.setUTCDate(candidateUser.getUTCDate() + 1);
  }

  for (let i = 0; i < 8; i++) {
    const dayOfWeek = candidateUser.getUTCDay(); // 0-6
    if (targetDayNumbers.includes(dayOfWeek)) {
      // Convert back to absolute UTC Date
      return new Date(candidateUser.getTime() + offsetMs);
    }
    candidateUser.setUTCDate(candidateUser.getUTCDate() + 1);
  }

  return new Date(candidateUser.getTime() + offsetMs);
}

/**
 * Schedule the next Reel for an active ReelSeries
 */
export async function scheduleNextReel(seriesId: string, timezoneOffset?: number) {
  try {
    const series = await prisma.reelSeries.findUnique({
      where: { id: seriesId },
      include: {
        reels: {
          where: { status: 'PENDING' }
        }
      }
    });

    if (!series) {
      logger.warn({ event: 'schedule_next_reel_skipped_no_series', seriesId });
      return null;
    }

    if (!series.isActive) {
      logger.info({ event: 'schedule_next_reel_skipped_inactive', seriesId });
      return null;
    }

    // If there's already a PENDING reel, don't schedule another one
    if (series.reels.length > 0) {
      logger.info({ event: 'schedule_next_reel_skipped_already_pending', seriesId, reelId: series.reels[0].id });
      return series.reels[0];
    }

    // Calculate next run time using passed offset or persistently saved series timezoneOffset
    const resolvedOffset = timezoneOffset !== undefined ? timezoneOffset : (series.timezoneOffset !== null ? series.timezoneOffset : undefined);
    const nextDate = getNextScheduledDate(series.scheduleDays, series.scheduleTime || '12:00', resolvedOffset);

    // Create PENDING reel
    const reel = await prisma.reel.create({
      data: {
        seriesId: series.id,
        status: 'PENDING',
        scheduledFor: nextDate,
        socialChannels: series.socialChannels,
      },
    });

    // Enqueue delayed BullMQ job to run 1 hour before schedule (or immediately if less than 1 hour away)
    // This allows time for generation, so it can be automatically scheduled to post exactly AT the requested time.
    const GENERATION_LEAD_TIME = 60 * 60 * 1000; 
    const delay = Math.max(0, nextDate.getTime() - Date.now() - GENERATION_LEAD_TIME);
    
    await reelGenerationQueue.add(
      'generate-reel',
      { reelId: reel.id, seriesId: series.id },
      {
        jobId: `reel-${reel.id}`,
        delay,
      }
    );

    logger.info({ 
      event: 'reel_scheduled_successfully', 
      seriesId, 
      reelId: reel.id, 
      scheduledFor: nextDate.toISOString(), 
      delayMs: delay 
    });

    return reel;
  } catch (error: any) {
    logger.error({ event: 'schedule_next_reel_failed', seriesId, error: error.message });
    throw error;
  }
}
