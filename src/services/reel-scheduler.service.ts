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

  // Map of weekday abbreviations to numbers (0 = Sunday, 1 = Monday, etc.)
  const dayMap: Record<string, number> = {
    'SUN': 0, 'MON': 1, 'TUE': 2, 'WED': 3, 'THU': 4, 'FRI': 5, 'SAT': 6
  };

  const targetDayNumbers = days.map(d => dayMap[d.toUpperCase()]).filter(n => n !== undefined);

  // Find the next matching day and time
  let candidate = new Date(now);
  candidate.setHours(hours, minutes, 0, 0);

  // Adjust for client timezoneOffset if applicable
  if (timezoneOffset !== undefined) {
    const localUtcTime = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    candidate = new Date(localUtcTime + (timezoneOffset * 60 * 1000));
  }

  // If candidate is in the past, start searching from tomorrow
  if (candidate <= now) {
    candidate.setDate(candidate.getDate() + 1);
  }

  // Loop up to 8 days to find the next day that is in the allowed scheduleDays
  for (let i = 0; i < 8; i++) {
    const dayOfWeek = candidate.getDay(); // 0-6
    if (targetDayNumbers.includes(dayOfWeek)) {
      return candidate;
    }
    candidate.setDate(candidate.getDate() + 1);
  }

  return candidate;
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

    // Enqueue delayed BullMQ job
    const delay = Math.max(0, nextDate.getTime() - Date.now());
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
