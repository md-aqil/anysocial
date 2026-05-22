-- AlterTable
ALTER TABLE "reel_series" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "reel_series" ADD COLUMN IF NOT EXISTS "schedule_days" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "reel_series" ADD COLUMN IF NOT EXISTS "schedule_time" TEXT;
ALTER TABLE "reel_series" ADD COLUMN IF NOT EXISTS "social_channels" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "reels" ADD COLUMN IF NOT EXISTS "socialChannels" TEXT NOT NULL DEFAULT '[]';
