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
  }
};

export function getPlatformConfig(platform: string): PlatformOAuthConfig {
  const config = platformConfigs[platform.toUpperCase()];
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  return config;
}
