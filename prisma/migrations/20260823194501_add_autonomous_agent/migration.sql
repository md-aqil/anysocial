-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TWITTER', 'TIKTOK', 'YOUTUBE', 'THREADS', 'PINTEREST', 'SNAPCHAT', 'REDDIT');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('CONNECTED', 'EXPIRED', 'REVOKED', 'ERROR');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'QUEUED', 'PROCESSING', 'PUBLISHED', 'FAILED', 'PARTIALLY_FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FetchStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RATE_LIMITED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'WEBHOOK', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED', 'RETRYING', 'PENDING');

-- CreateEnum
CREATE TYPE "WebhookEvent" AS ENUM ('POST_PUBLISHED', 'POST_FAILED', 'POST_VIRAL', 'QUOTA_WARNING');

-- CreateEnum
CREATE TYPE "ReelType" AS ENUM ('SERIES', 'PRODUCT', 'VEO_SHORT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "hermes_api_key" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "external_account_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expiry" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "AccountStatus" NOT NULL DEFAULT 'CONNECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "last_refreshed" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_states" (
    "id" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "state_token" TEXT NOT NULL,
    "user_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "pending_data" JSONB,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "raw_content" TEXT NOT NULL,
    "media_urls" TEXT[],
    "platforms" TEXT[],
    "timezone" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "platform_results" JSONB[],
    "platform_options" JSONB,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_media" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "original_url" TEXT NOT NULL,
    "platform_variants" JSONB NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "dimensions" JSONB NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_analytics" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "published_at" TIMESTAMP(3) NOT NULL,
    "metrics" JSONB NOT NULL,
    "last_fetched_at" TIMESTAMP(3) NOT NULL,
    "fetchStatus" "FetchStatus" NOT NULL DEFAULT 'PENDING',
    "fetch_error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "post_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint_url" TEXT NOT NULL,
    "events" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "secret" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notification_type" "NotificationType" NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "error_message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "actor_email" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_rollups" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "period" TEXT NOT NULL,
    "platform" TEXT,
    "total_posts" INTEGER NOT NULL DEFAULT 0,
    "published" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "total_likes" INTEGER NOT NULL DEFAULT 0,
    "total_comments" INTEGER NOT NULL DEFAULT 0,
    "total_shares" INTEGER NOT NULL DEFAULT 0,
    "total_reach" INTEGER NOT NULL DEFAULT 0,
    "engagement_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_rollups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reel_series" (
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
    "timezone_offset" INTEGER,
    "social_channels" TEXT NOT NULL DEFAULT '[]',
    "target_region" TEXT NOT NULL DEFAULT 'Global',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reel_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reels" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "ReelType" NOT NULL DEFAULT 'SERIES',
    "seriesId" TEXT,
    "script" TEXT,
    "videoUrl" TEXT,
    "thumbnail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "statusMessage" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "socialChannels" TEXT NOT NULL DEFAULT '[]',
    "postId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_reel_assets" (
    "id" TEXT NOT NULL,
    "reelId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_reel_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curated_posts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "external_post_id" TEXT NOT NULL,
    "content" TEXT,
    "media_urls" TEXT[],
    "metrics" JSONB,
    "published_at" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "curated_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_characters" (
    "id" TEXT NOT NULL,
    "series_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "demographics" JSONB,
    "physical" JSONB,
    "wardrobe" JSONB,
    "mannerisms" JSONB,
    "lora_reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_locations" (
    "id" TEXT NOT NULL,
    "series_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "architecture" TEXT,
    "lighting" TEXT,
    "atmosphere" TEXT,
    "color_palette" JSONB,
    "key_objects" JSONB,
    "camera_mood" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_objects" (
    "id" TEXT NOT NULL,
    "series_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "material" TEXT,
    "details" TEXT,
    "scale" TEXT,
    "state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_objects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_creatives" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "brief" JSONB NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_creatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playground_images" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playground_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "automated_campaigns" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "website_url" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "social_channels" TEXT NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT DEFAULT 'English',
    "voice_id" TEXT DEFAULT 'Aoede',
    "ingredients_to_video" BOOLEAN NOT NULL DEFAULT false,
    "image_to_video" BOOLEAN NOT NULL DEFAULT false,
    "animate_image_count" INTEGER NOT NULL DEFAULT 3,
    "voice_prompt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automated_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automated_products" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "product_url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "images" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reel_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automated_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_knowledge_bases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "services" TEXT NOT NULL,
    "target_audience" TEXT NOT NULL,
    "pain_points" TEXT NOT NULL,
    "usps" TEXT NOT NULL,
    "case_studies" TEXT,
    "tone" TEXT NOT NULL DEFAULT 'Professional',
    "language" TEXT NOT NULL DEFAULT 'English',
    "voice_id" TEXT NOT NULL DEFAULT 'Puck',
    "strategy" JSONB,
    "social_channels" TEXT NOT NULL DEFAULT '[]',
    "schedule_days" TEXT NOT NULL DEFAULT '[]',
    "schedule_time" TEXT,
    "timezone_offset" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_knowledge_bases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_reels" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kb_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "script" TEXT,
    "video_url" TEXT,
    "thumbnail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "status_message" TEXT,
    "scheduled_for" TIMESTAMP(3),
    "social_channels" TEXT NOT NULL DEFAULT '[]',
    "post_id" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_reels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hermes_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "payload" JSONB NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "scheduled_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hermes_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hermes_executions" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "status" TEXT NOT NULL,
    "duration" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hermes_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_hermes_api_key_key" ON "users"("hermes_api_key");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "social_accounts_userId_status_idx" ON "social_accounts"("userId", "status");

-- CreateIndex
CREATE INDEX "social_accounts_token_expiry_idx" ON "social_accounts"("token_expiry");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_userId_platform_external_account_id_key" ON "social_accounts"("userId", "platform", "external_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_states_state_token_key" ON "oauth_states"("state_token");

-- CreateIndex
CREATE INDEX "oauth_states_state_token_expires_at_idx" ON "oauth_states"("state_token", "expires_at");

-- CreateIndex
CREATE INDEX "posts_userId_status_idx" ON "posts"("userId", "status");

-- CreateIndex
CREATE INDEX "posts_scheduled_at_idx" ON "posts"("scheduled_at");

-- CreateIndex
CREATE INDEX "posts_userId_scheduled_at_idx" ON "posts"("userId", "scheduled_at");

-- CreateIndex
CREATE INDEX "posts_published_at_idx" ON "posts"("published_at");

-- CreateIndex
CREATE INDEX "post_media_postId_idx" ON "post_media"("postId");

-- CreateIndex
CREATE INDEX "post_analytics_postId_idx" ON "post_analytics"("postId");

-- CreateIndex
CREATE INDEX "post_analytics_fetchStatus_idx" ON "post_analytics"("fetchStatus");

-- CreateIndex
CREATE UNIQUE INDEX "post_analytics_postId_platform_key" ON "post_analytics"("postId", "platform");

-- CreateIndex
CREATE INDEX "webhook_subscriptions_userId_is_active_idx" ON "webhook_subscriptions"("userId", "is_active");

-- CreateIndex
CREATE INDEX "notifications_userId_is_read_idx" ON "notifications"("userId", "is_read");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "notification_logs_userId_status_idx" ON "notification_logs"("userId", "status");

-- CreateIndex
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_logs_actor_user_id_idx" ON "admin_audit_logs"("actor_user_id");

-- CreateIndex
CREATE INDEX "admin_audit_logs_resource_type_resource_id_idx" ON "admin_audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "analytics_rollups_user_id_date_period_idx" ON "analytics_rollups"("user_id", "date", "period");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_rollups_user_id_date_period_platform_key" ON "analytics_rollups"("user_id", "date", "period", "platform");

-- CreateIndex
CREATE INDEX "reels_seriesId_idx" ON "reels"("seriesId");

-- CreateIndex
CREATE INDEX "reels_userId_idx" ON "reels"("userId");

-- CreateIndex
CREATE INDEX "product_reel_assets_reelId_idx" ON "product_reel_assets"("reelId");

-- CreateIndex
CREATE INDEX "curated_posts_userId_idx" ON "curated_posts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "curated_posts_userId_platform_external_post_id_key" ON "curated_posts"("userId", "platform", "external_post_id");

-- CreateIndex
CREATE INDEX "series_characters_series_id_idx" ON "series_characters"("series_id");

-- CreateIndex
CREATE INDEX "series_locations_series_id_idx" ON "series_locations"("series_id");

-- CreateIndex
CREATE INDEX "series_objects_series_id_idx" ON "series_objects"("series_id");

-- CreateIndex
CREATE INDEX "ad_creatives_userId_idx" ON "ad_creatives"("userId");

-- CreateIndex
CREATE INDEX "playground_images_userId_idx" ON "playground_images"("userId");

-- CreateIndex
CREATE INDEX "automated_campaigns_userId_idx" ON "automated_campaigns"("userId");

-- CreateIndex
CREATE INDEX "automated_products_campaign_id_status_idx" ON "automated_products"("campaign_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "automated_products_campaign_id_product_url_key" ON "automated_products"("campaign_id", "product_url");

-- CreateIndex
CREATE INDEX "company_knowledge_bases_userId_idx" ON "company_knowledge_bases"("userId");

-- CreateIndex
CREATE INDEX "company_reels_kb_id_idx" ON "company_reels"("kb_id");

-- CreateIndex
CREATE INDEX "company_reels_userId_idx" ON "company_reels"("userId");

-- CreateIndex
CREATE INDEX "hermes_tasks_userId_status_idx" ON "hermes_tasks"("userId", "status");

-- CreateIndex
CREATE INDEX "hermes_tasks_scheduled_at_idx" ON "hermes_tasks"("scheduled_at");

-- CreateIndex
CREATE INDEX "hermes_executions_taskId_idx" ON "hermes_executions"("taskId");

-- CreateIndex
CREATE INDEX "hermes_executions_agent_id_idx" ON "hermes_executions"("agent_id");

-- AddForeignKey
ALTER TABLE "social_accounts" ADD CONSTRAINT "social_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_states" ADD CONSTRAINT "oauth_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_media" ADD CONSTRAINT "post_media_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_analytics" ADD CONSTRAINT "post_analytics_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_subscriptions" ADD CONSTRAINT "webhook_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_series" ADD CONSTRAINT "reel_series_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "reel_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reel_assets" ADD CONSTRAINT "product_reel_assets_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curated_posts" ADD CONSTRAINT "curated_posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_characters" ADD CONSTRAINT "series_characters_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "reel_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_locations" ADD CONSTRAINT "series_locations_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "reel_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_objects" ADD CONSTRAINT "series_objects_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "reel_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ad_creatives" ADD CONSTRAINT "ad_creatives_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playground_images" ADD CONSTRAINT "playground_images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automated_campaigns" ADD CONSTRAINT "automated_campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automated_products" ADD CONSTRAINT "automated_products_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "automated_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_knowledge_bases" ADD CONSTRAINT "company_knowledge_bases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_reels" ADD CONSTRAINT "company_reels_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_reels" ADD CONSTRAINT "company_reels_kb_id_fkey" FOREIGN KEY ("kb_id") REFERENCES "company_knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_reels" ADD CONSTRAINT "company_reels_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hermes_tasks" ADD CONSTRAINT "hermes_tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hermes_executions" ADD CONSTRAINT "hermes_executions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "hermes_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
