import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getPlatformColor(platform: string) {
  const colors: Record<string, string> = {
    FACEBOOK: 'bg-blue-600',
    INSTAGRAM: 'bg-pink-600',
    TWITTER: 'bg-sky-500',
    LINKEDIN: 'bg-blue-700',
    YOUTUBE: 'bg-red-600',
    THREADS: 'bg-black',
    TIKTOK: 'bg-black',
    PINTEREST: 'bg-red-700',
    SNAPCHAT: 'bg-yellow-400',
  };
  return colors[platform.toUpperCase()] || 'bg-slate-500';
}

export function formatDateTime(date: string | Date) {
  if (!date) return 'N/A';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  } catch (e) {
    return 'Invalid Date';
  }
}
