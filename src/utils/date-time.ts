import { DateTime } from 'luxon';
import { SchedulingError } from './errors.js';

const MIN_SCHEDULE_DELAY_MS = 60 * 1000; // 1 minute
const MAX_SCHEDULE_DELAY_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

export interface DateValidationResult {
  valid: boolean;
  errors: string[];
  utcDate?: Date;
}

/**
 * Convert local time in user's timezone to UTC Date
 */
export function convertToUTC(localTime: string, timezone: string): Date {
  const localDateTime = DateTime.fromISO(localTime, { zone: timezone });

  if (!localDateTime.isValid) {
    throw new SchedulingError(`Invalid date/time: ${localDateTime.invalidReason}`);
  }

  const utcDateTime = localDateTime.toUTC();
  return utcDateTime.toJSDate();
}

/**
 * Validate scheduled date meets constraints
 */
export function validateScheduledDate(scheduledAt: Date): DateValidationResult {
  const now = new Date();
  const diff = scheduledAt.getTime() - now.getTime();

  const errors: string[] = [];

  if (scheduledAt < now) {
    errors.push('Scheduled time must be in the future');
  }

  if (diff < MIN_SCHEDULE_DELAY_MS) {
    errors.push(`Scheduled time must be at least 1 minute from now`);
  }

  if (diff > MAX_SCHEDULE_DELAY_MS) {
    errors.push('Scheduled time cannot be more than 1 year from now');
  }

  return {
    valid: errors.length === 0,
    errors,
    utcDate: errors.length === 0 ? scheduledAt : undefined
  };
}

/**
 * Detect invalid times (e.g., 25:00, DST gaps)
 */
export function detectInvalidTime(time: string, timezone: string): boolean {
  const dateTime = DateTime.fromISO(time, { zone: timezone });
  return !dateTime.isValid;
}

/**
 * Format date in human-readable format for UI
 */
export function formatHumanReadable(date: Date, timezone: string): string {
  const dateTime = DateTime.fromJSDate(date).setZone(timezone);
  return dateTime.toLocaleString(DateTime.DATETIME_MED);
}

/**
 * Get next run time for job display
 */
export function getNextRunTime(scheduledAt: Date): string {
  const now = new Date();
  const diff = scheduledAt.getTime() - now.getTime();

  if (diff <= 0) {
    return 'Running now';
  }

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `In ${days} day${days > 1 ? 's' : ''} at ${formatHumanReadable(scheduledAt, 'local')}`;
  }

  if (hours > 0) {
    return `In ${hours} hour${hours > 1 ? 's' : ''} at ${formatHumanReadable(scheduledAt, 'local')}`;
  }

  return `In ${minutes} minute${minutes > 1 ? 's' : ''}`;
}

/**
 * Validate IANA timezone
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    DateTime.local().setZone(timezone);
    return true;
  } catch {
    return false;
  }
}
