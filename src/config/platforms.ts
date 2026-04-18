export interface PlatformOAuthConfig {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdKey: string;
  clientSecretKey: string;
  configIdKey?: string;
  usePKCE: boolean;
  extraTokenExchangeHeaders?: Record<string, string>;
  tokenExpirySeconds?: number;
}

export const platformConfigs: Record<string, PlatformOAuthConfig> = {
  INSTAGRAM: {
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scopes: ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'pages_show_list', 'pages_read_engagement'],
    clientIdKey: 'FACEBOOK_CLIENT_ID',
    clientSecretKey: 'FACEBOOK_CLIENT_SECRET',
    configIdKey: 'FACEBOOK_CONFIG_ID',
    usePKCE: false,
    tokenExpirySeconds: 5184000 // 60 days
  },
  
  THREADS: {
    authUrl: 'https://www.threads.net/oauth/authorize',
    tokenUrl: 'https://graph.threads.net/oauth/access_token',
    scopes: ['threads_basic', 'threads_content_publish'],
    clientIdKey: 'THREADS_CLIENT_ID', // Must be the specific Threads App ID, not Meta App ID
    clientSecretKey: 'THREADS_CLIENT_SECRET',
    usePKCE: false,
    tokenExpirySeconds: 5184000 // 60 days
  },
  
  FACEBOOK: {
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scopes: ['pages_manage_posts', 'pages_read_engagement'],
    clientIdKey: 'FACEBOOK_CLIENT_ID',
    clientSecretKey: 'FACEBOOK_CLIENT_SECRET',
    configIdKey: 'FACEBOOK_CONFIG_ID',
    usePKCE: false,
    tokenExpirySeconds: 5184000 // 60 days
  },
  
  LINKEDIN: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['openid', 'profile', 'email', 'w_member_social', 'r_basicprofile'],
    clientIdKey: 'LINKEDIN_CLIENT_ID',
    clientSecretKey: 'LINKEDIN_CLIENT_SECRET',
    usePKCE: false
  },
  
  TWITTER: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    clientIdKey: 'TWITTER_CLIENT_ID',
    clientSecretKey: 'TWITTER_CLIENT_SECRET',
    usePKCE: true
  },
  
  TIKTOK: {
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
    scopes: ['user.info.basic', 'video.upload', 'video.list'],
    clientIdKey: 'TIKTOK_CLIENT_ID',
    clientSecretKey: 'TIKTOK_CLIENT_SECRET',
    usePKCE: true,
    extraTokenExchangeHeaders: { 'Content-Type': 'application/x-www-form-urlencoded' }
  },
  
  YOUTUBE: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.force-ssl',
      'https://www.googleapis.com/auth/userinfo.profile'
    ],
    clientIdKey: 'YOUTUBE_CLIENT_ID',
    clientSecretKey: 'YOUTUBE_CLIENT_SECRET',
    usePKCE: false,
    extraTokenExchangeHeaders: { 'Content-Type': 'application/x-www-form-urlencoded' }
  },

  PINTEREST: {
    authUrl: 'https://www.pinterest.com/oauth/',
    tokenUrl: 'https://api.pinterest.com/v5/oauth/token',
    scopes: ['user_accounts:read', 'boards:read', 'pins:read', 'pins:write'],
    clientIdKey: 'PINTEREST_CLIENT_ID',
    clientSecretKey: 'PINTEREST_CLIENT_SECRET',
    usePKCE: false
  },

  SNAPCHAT: {
    authUrl: 'https://accounts.snapchat.com/login/oauth2/authorize',
    tokenUrl: 'https://accounts.snapchat.com/login/oauth2/access_token',
    scopes: ['snapchat-marketing-api', 'snapchat-profile-api'],
    clientIdKey: 'SNAPCHAT_CLIENT_ID',
    clientSecretKey: 'SNAPCHAT_CLIENT_SECRET',
    usePKCE: false
  }
};

export function getPlatformConfig(platform: string): PlatformOAuthConfig {
  const config = platformConfigs[platform.toUpperCase()];
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return config;
}
