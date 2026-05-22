-- CreateTable
CREATE TABLE IF NOT EXISTS "reel_series" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "niche" TEXT,
    "customPrompt" TEXT,
    "language" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "musicId" TEXT,
    "artStyle" TEXT NOT NULL,
    "duration" TEXT NOT NULL DEFAULT '30s',
    "hook_type" TEXT,
    "tone" TEXT,
    "story_structure" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "schedule_days" TEXT NOT NULL DEFAULT '[]',
    "schedule_time" TEXT,
    "social_channels" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reel_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "reels" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "script" TEXT,
    "videoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "statusMessage" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "socialChannels" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reel_series_userId_idx" ON "reel_series"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "reels_seriesId_idx" ON "reels"("seriesId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reel_series_userId_fkey') THEN
        ALTER TABLE "reel_series" ADD CONSTRAINT "reel_series_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reels_seriesId_fkey') THEN
        ALTER TABLE "reels" ADD CONSTRAINT "reels_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "reel_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
