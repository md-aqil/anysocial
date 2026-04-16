import { z } from 'zod';

const AspectRatioSchema = z.object({
  ratio: z.number(),
  tolerance: z.number().default(0.05)
});

const DimensionsSchema = z.object({
  width: z.number(),
  height: z.number()
});

const PlatformRuleSchema = z.object({
  maxChars: z.number(),
  maxMediaCount: z.number(),
  allowedMimeTypes: z.array(z.string()),
  aspectRatios: z.array(z.number()),
  minDimensions: DimensionsSchema,
  hashtagLimit: z.number(),
  mentionFormat: z.string(),
  videoDurationLimit: z.number(), // seconds
  linkPolicy: z.enum(['strip', 'count-as-chars', 'ignore']),
  maxFileSize: z.number() // bytes
});

export type PlatformRule = z.infer<typeof PlatformRuleSchema>;

export const PLATFORM_RULES: Record<string, PlatformRule> = {
  INSTAGRAM: {
    maxChars: 2200,
    maxMediaCount: 10, // Carousel
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
    aspectRatios: [1.0, 1.777, 0.8, 0.75, 1.333, 1.91], // 1:1, 16:9, 4:5, 3:4, 4:3, 1.91:1
    minDimensions: { width: 600, height: 600 },
    hashtagLimit: 30,
    mentionFormat: '@username',
    videoDurationLimit: 60, // 60 seconds for feed posts
    linkPolicy: 'ignore', // Links in caption not clickable
    maxFileSize: 100 * 1024 * 1024 // 100MB
  },

  FACEBOOK: {
    maxChars: 63206, // Facebook limits
    maxMediaCount: 10,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime'],
    aspectRatios: [1.0, 1.333, 1.777, 0.8, 1.5, 0.666, 0.75, 1.25, 0.562], // Extremely flexible
    minDimensions: { width: 100, height: 100 },
    hashtagLimit: 30, // Recommended
    mentionFormat: '@pagename',
    videoDurationLimit: 14400, // 4 hours
    linkPolicy: 'ignore',
    maxFileSize: 10 * 1024 * 1024 * 1024 // 10 GB limit for videos
  },

  LINKEDIN: {
    maxChars: 3000,
    maxMediaCount: 9,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'],
    aspectRatios: [1.777, 1.0, 0.5625, 1.5, 1.333, 0.8, 1.25, 0.75], // highly forgiving list
    minDimensions: { width: 250, height: 250 },
    hashtagLimit: 3,
    mentionFormat: '@username',
    videoDurationLimit: 600, // 10 minutes
    linkPolicy: 'count-as-chars',
    maxFileSize: 200 * 1024 * 1024 // 200MB
  },

  TWITTER: {
    maxChars: 280,
    maxMediaCount: 4,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'video/mp4', 'image/gif'],
    aspectRatios: [2.0, 1.0, 0.5], // 2:1, 1:1, 1:2
    minDimensions: { width: 600, height: 335 },
    hashtagLimit: 280, // Counted in character limit
    mentionFormat: '@username',
    videoDurationLimit: 140, // 2 minutes 20 seconds
    linkPolicy: 'count-as-chars', // URLs count as 23 chars
    maxFileSize: 512 * 1024 * 1024 // 512MB
  },

  TIKTOK: {
    maxChars: 2200,
    maxMediaCount: 1, // Video only
    allowedMimeTypes: ['video/mp4', 'video/webm'],
    aspectRatios: [0.5625, 1.0], // 9:16, 1:1
    minDimensions: { width: 540, height: 960 },
    hashtagLimit: 100,
    mentionFormat: '@username',
    videoDurationLimit: 600, // 10 minutes (was 3 min, now extended)
    linkPolicy: 'ignore', // No links in caption
    maxFileSize: 287.6 * 1024 * 1024 // 287.6MB
  },

  YOUTUBE: {
    maxChars: 5000, // Description
    maxMediaCount: 1, // Single video
    allowedMimeTypes: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo'],
    aspectRatios: [1.777], // 16:9 recommended
    minDimensions: { width: 1280, height: 720 }, // 720p minimum
    hashtagLimit: 15,
    mentionFormat: '@channelname',
    videoDurationLimit: 43200, // 12 hours
    linkPolicy: 'count-as-chars',
    maxFileSize: 256 * 1024 * 1024 * 1024 // 256GB
  }
};

// Validate all platform rules at startup
export function validatePlatformRules(): void {
  try {
    Object.entries(PLATFORM_RULES).forEach(([platform, rules]) => {
      PlatformRuleSchema.parse(rules);
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Platform rules validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Get platform rules with type safety
 */
export function getPlatformRules(platform: string): PlatformRule {
  const rules = PLATFORM_RULES[platform.toUpperCase()];
  if (!rules) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return rules;
}

/**
 * Check if aspect ratio is valid for platform (with tolerance)
 */
export function isAspectRatioValid(
  aspectRatio: number,
  platform: string,
  tolerance: number = 0.05
): boolean {
  // Only Instagram stringently enforces aspect ratios API-side
  if (['FACEBOOK', 'TWITTER', 'LINKEDIN'].includes(platform.toUpperCase())) {
    return true; 
  }

  const rules = getPlatformRules(platform);
  return rules.aspectRatios.some((validRatio) => {
    return Math.abs(aspectRatio - validRatio) <= tolerance;
  });
}

/**
 * Check if MIME type is allowed for platform
 */
export function isMimeTypeValid(mimeType: string, platform: string): boolean {
  const rules = getPlatformRules(platform);
  return rules.allowedMimeTypes.includes(mimeType);
}

/**
 * Get recommended aspect ratio closest to provided ratio
 */
export function getRecommendedAspectRatio(
  aspectRatio: number,
  platform: string
): number {
  const rules = getPlatformRules(platform);
  return rules.aspectRatios.reduce((closest, current) => {
    return Math.abs(current - aspectRatio) < Math.abs(closest - aspectRatio)
      ? current
      : closest;
  });
}
