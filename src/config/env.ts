import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.string().default('info'),
  
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  
  TOKEN_ENCRYPTION_KEY: z.string().length(64, 'TOKEN_ENCRYPTION_KEY must be 32 bytes (64 hex chars)'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  
  BASE_URL: z.string().url(),
  FRONTEND_URL: z.string().optional(),
  
  // Instagram (Meta)
  INSTAGRAM_CLIENT_ID: z.string(),
  INSTAGRAM_CLIENT_SECRET: z.string(),
  
  // LinkedIn
  LINKEDIN_CLIENT_ID: z.string(),
  LINKEDIN_CLIENT_SECRET: z.string(),
  
  // X/Twitter
  TWITTER_CLIENT_ID: z.string(),
  TWITTER_CLIENT_SECRET: z.string(),
  
  // TikTok
  TIKTOK_CLIENT_ID: z.string(),
  TIKTOK_CLIENT_SECRET: z.string(),
  
  // YouTube (Google)
  YOUTUBE_CLIENT_ID: z.string(),
  YOUTUBE_CLIENT_SECRET: z.string(),
});

export type Env = z.infer<typeof envSchema>;

try {
  envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Environment validation failed:');
    (error as z.ZodError).errors.forEach((err: z.ZodIssue) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    console.error('\nPlease check your .env file against .env.example');
    process.exit(1);
  }
  throw error;
}

export const env = envSchema.parse(process.env);
