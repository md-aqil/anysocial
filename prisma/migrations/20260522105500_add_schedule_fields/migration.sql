-- AlterTable
ALTER TABLE "reel_series" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "reel_series" ADD COLUMN "schedule_days" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "reel_series" ADD COLUMN "schedule_time" TEXT;
ALTER TABLE "reel_series" ADD COLUMN "social_channels" TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "reels" ADD COLUMN "socialChannels" TEXT NOT NULL DEFAULT '[]';
