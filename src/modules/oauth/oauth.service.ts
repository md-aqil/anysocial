import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { prisma } from '../../db/prisma.js';

function logToFile(message: string) {
  try {
    const logPath = path.join(process.cwd(), 'scratch', 'backend-debug.log');
    const timestamp = new Date().toISOString();
    if (!fs.existsSync(path.dirname(logPath))) {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
    }
    fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
  } catch (err) {
    console.error('logToFile failed:', err);
  }
}
import { redis } from '../../db/redis.js';
import { logger } from '../../logger/pino.js';
import { tokenCrypto } from '../../crypto/token-crypto.service.js';
import { getPlatformConfig } from '../../config/platforms.js';
import { OAuthError } from '../../errors/oauth.error.js';
import {
  generateStateToken,
  generateCodeVerifier,
  generateCodeChallenge,
  buildAuthUrl,
  sanitizeAccount
} from '../../utils/helpers.js';
import type { Platform } from '@prisma/client';

const STATE_EXPIRY_MINUTES = 10;
const PKCE_TTL_SECONDS = STATE_EXPIRY_MINUTES * 60;

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

export class OAuthService {
  async generateAuthUrl(
    platform: Platform,
    userId: string,
    redirectUri: string,
    returnTo?: string
  ): Promise<{ authUrl: string; state: string }> {
    const config = getPlatformConfig(platform);
    const state = generateStateToken();
    const clientId = process.env[config.clientIdKey];

    if (!clientId) {
      throw new OAuthError(
        `OAuth is not configured for ${platform}. Please set ${config.clientIdKey} in your environment variables.`,
        'MISSING_CLIENT_ID',
        400
      );
    }

    // Store state in database
    const expiresAt = new Date(Date.now() + STATE_EXPIRY_MINUTES * 60 * 1000);
    await prisma.oAuthState.create({
      data: {
        platform,
        stateToken: state,
        userId,
        expiresAt,
        pendingData: returnTo ? { returnTo } : undefined
      }
    });

    // Build auth URL params
    const params: Record<string, string> = {
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state
    };

    if (config.configIdKey && process.env[config.configIdKey] && platform !== 'INSTAGRAM') {
      params.config_id = process.env[config.configIdKey]!;
    } else {
      params.scope = config.scopes.join(' ');
    }

    // Handle PKCE
    let codeVerifier: string | undefined;
    if (config.usePKCE) {
      codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      params.code_challenge = codeChallenge;
      params.code_challenge_method = 'S256';

      // Store code_verifier in Redis
      await redis.setex(`pkce:${state}`, PKCE_TTL_SECONDS, codeVerifier);
    }

    // Platform-specific extras
    if (platform === 'YOUTUBE') {
      params.access_type = 'offline';
      params.prompt = 'consent';
    }

    const authUrl = buildAuthUrl(config.authUrl, params);

    logger.info({
      event: 'oauth_flow_started',
      platform,
      userId,
      state
    });

    return { authUrl, state };
  }

  async handleCallback(
    platform: Platform,
    code: string,
    state: string,
    redirectUri: string
  ): Promise<{ success: boolean; account?: any; needsSelection?: boolean; accounts?: any[] }> {
    // Validate state
    const oauthState = await prisma.oAuthState.findUnique({
      where: { stateToken: state }
    });

    if (!oauthState) {
      throw new OAuthError('Invalid state token', 'INVALID_STATE');
    }

    if (oauthState.expiresAt < new Date()) {
      throw new OAuthError('State token expired', 'STATE_EXPIRED');
    }

    // Do NOT delete state yet if we need it for selective connection
    // We will delete it at the end of handleCallback (if no selection needed) 
    // or in confirmSelection (if selection was needed)
    // await prisma.oAuthState.delete({ where: { id: oauthState.id } });

    // Retrieve code_verifier if PKCE
    let codeVerifier: string | undefined;
    if (getPlatformConfig(platform).usePKCE) {
      codeVerifier = (await redis.get(`pkce:${state}`)) || undefined;
      if (codeVerifier) {
        await redis.del(`pkce:${state}`);
      }
    }

    // Exchange code for tokens
    let tokenData = await this.exchangeCodeForTokens(
      platform,
      code,
      redirectUri,
      codeVerifier
    );

    // Meta (FB/IG/Threads) exchange for long-lived token
    tokenData = await this.convertToLongLived(platform, tokenData);

    // Get external account IDs and Names (now returns an array)
    const accountInfos = await this.getExternalAccountId(
      platform,
      tokenData.access_token
    );
    
    logToFile(`DISCOVERED: platform=${platform}, count=${accountInfos.length}, ids=${accountInfos.map(a => a.id).join(',')}`);

    // Default: Auto-connect all discovered accounts
    const accounts = [];
    for (const info of accountInfos) {
      const externalAccountId = info.id;
      const accountMetadata = info.name ? { accountName: info.name, username: info.username } : {};

      // Build the final access token
      const finalAccessToken = info.overrideAccessToken || tokenData.access_token;

      // Encrypt tokens
      const encryptedAccess = tokenCrypto.encrypt(finalAccessToken);
      const encryptedRefresh = tokenData.refresh_token
        ? tokenCrypto.encrypt(tokenData.refresh_token)
        : null;

      // Calculate token expiry
      const config = getPlatformConfig(platform);
      // Use actual expires_in if provided, otherwise fallback to config default
      const expiresIn = tokenData.expires_in || config.tokenExpirySeconds || 3600;
      const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      // Upsert social account
      const account = await prisma.socialAccount.upsert({
        where: {
          userId_platform_externalAccountId: {
            userId: oauthState.userId!,
            platform,
            externalAccountId
          }
        },
        update: {
          accessToken: JSON.stringify(encryptedAccess),
          refreshToken: encryptedRefresh ? JSON.stringify(encryptedRefresh) : null,
          tokenExpiry,
          scopes: tokenData.scope?.split(' ') || config.scopes,
          status: 'CONNECTED',
          metadata: accountMetadata,
          lastRefreshed: new Date()
        },
        create: {
          userId: oauthState.userId!,
          platform,
          externalAccountId,
          accessToken: JSON.stringify(encryptedAccess),
          refreshToken: encryptedRefresh ? JSON.stringify(encryptedRefresh) : null,
          tokenExpiry,
          scopes: tokenData.scope?.split(' ') || config.scopes,
          status: 'CONNECTED',
          metadata: accountMetadata
        }
      });
      accounts.push(sanitizeAccount(account));
      await this.queueRefresh(account.id, tokenExpiry);
    }

    // Mark state as completed since we connected immediately and delete it
    await prisma.oAuthState.delete({
      where: { stateToken: state }
    });

    return {
      success: true,
      needsSelection: false,
      accounts
    };
  }

  /**
   * Finalize connection for selected accounts
   */
  async confirmSelection(stateToken: string, selectedExternalIds: string[]): Promise<any[]> {
    const oauthState = await prisma.oAuthState.findUnique({
      where: { stateToken }
    });

    if (!oauthState || !oauthState.pendingData || oauthState.isCompleted) {
      throw new OAuthError('Invalid or expired selection session', 'INVALID_SESSION', 400);
    }

    if (!oauthState.pendingData || typeof oauthState.pendingData !== 'object' || !('tokenData' in oauthState.pendingData)) {
      throw new OAuthError('Invalid pending data', 'INVALID_SESSION', 400);
    }
    let tokenData = (oauthState.pendingData as any).tokenData as any;
    const { accountInfos } = oauthState.pendingData as any;
    const platform = oauthState.platform;
    const userId = oauthState.userId!;
    const config = getPlatformConfig(platform);
    
    // Ensure we have long-lived token if it was skipped or needs re-check
    tokenData = await this.convertToLongLived(platform, tokenData);

    const results = [];
    const filteredInfos = accountInfos.filter((info: any) => selectedExternalIds.includes(info.id));

    for (const info of filteredInfos) {
      const finalAccessToken = info.overrideAccessToken || tokenData.access_token;
      const encryptedAccess = tokenCrypto.encrypt(finalAccessToken);
      const encryptedRefresh = tokenData.refresh_token ? tokenCrypto.encrypt(tokenData.refresh_token) : null;
      
      const expiresIn = tokenData.expires_in || config.tokenExpirySeconds || 3600;
      const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      const account = await prisma.socialAccount.upsert({
        where: {
          userId_platform_externalAccountId: {
            userId,
            platform,
            externalAccountId: info.id
          }
        },
        update: {
          accessToken: JSON.stringify(encryptedAccess),
          refreshToken: encryptedRefresh ? JSON.stringify(encryptedRefresh) : null,
          tokenExpiry,
          scopes: tokenData.scope?.split(' ') || config.scopes,
          status: 'CONNECTED',
          metadata: info.name ? { accountName: info.name, username: info.username } : {},
          lastRefreshed: new Date()
        },
        create: {
          userId,
          platform,
          externalAccountId: info.id,
          accessToken: JSON.stringify(encryptedAccess),
          refreshToken: encryptedRefresh ? JSON.stringify(encryptedRefresh) : null,
          tokenExpiry,
          scopes: tokenData.scope?.split(' ') || config.scopes,
          status: 'CONNECTED',
          metadata: info.name ? { accountName: info.name, username: info.username } : {}
        }
      });
      results.push(sanitizeAccount(account));
      await this.queueRefresh(account.id, tokenExpiry);
    }

    // Mark as completed and delete
    await prisma.oAuthState.delete({
      where: { stateToken }
    });

    return results;
  }

  async refreshToken(accountId: string): Promise<void> {
    const account = await prisma.socialAccount.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      throw new OAuthError('Account not found', 'ACCOUNT_NOT_FOUND', 404);
    }

    if (!account.refreshToken) {
      throw new OAuthError(
        'No refresh token available',
        'NO_REFRESH_TOKEN'
      );
    }

    const config = getPlatformConfig(account.platform);
    const encryptedRefresh = JSON.parse(account.refreshToken);
    const refreshToken = tokenCrypto.decrypt(encryptedRefresh);

    try {
      const clientId = process.env[config.clientIdKey]!;
      const clientSecret = process.env[config.clientSecretKey]!;

      const body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      });

      const headers: Record<string, string> = {
        ...(config.extraTokenExchangeHeaders || {}),
        'Content-Type': 'application/x-www-form-urlencoded'
      };

      if (account.platform === 'TWITTER' || account.platform === 'REDDIT') {
        const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        headers['Authorization'] = `Basic ${basicAuth}`;
        if (account.platform === 'TWITTER') {
          body.append('client_id', clientId);
        }
      } else {
        body.append('client_id', clientId);
        body.append('client_secret', clientSecret);
      }

      const response = await axios.post(config.tokenUrl, body.toString(), { headers });

      const tokenData = response.data as TokenResponse;

      // Encrypt new tokens
      const encryptedAccess = tokenCrypto.encrypt(tokenData.access_token);
      const encryptedRefresh = tokenData.refresh_token
        ? tokenCrypto.encrypt(tokenData.refresh_token)
        : null;

      const expiresIn = config.tokenExpirySeconds || tokenData.expires_in;
      const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      let accountMetadata = account.metadata as Record<string, any> | null;
      try {
        const accountInfos = await this.getExternalAccountId(
          account.platform,
          tokenData.access_token
        );
        const accountInfo = accountInfos[0];
        if (accountInfo?.name) {
          accountMetadata = { ...(accountMetadata || {}), accountName: accountInfo.name, username: accountInfo.username };
        }
      } catch (e) {
        logger.warn(`Failed to sync name during refresh for ${account.platform}`);
      }

      // Update account
      await prisma.socialAccount.update({
        where: { id: accountId },
        data: {
          accessToken: JSON.stringify(encryptedAccess),
          refreshToken: encryptedRefresh
            ? JSON.stringify(encryptedRefresh)
            : account.refreshToken,
          tokenExpiry,
          lastRefreshed: new Date(),
          status: 'CONNECTED',
          metadata: accountMetadata || undefined
        }
      });

      logger.info({
        event: 'token_refreshed',
        platform: account.platform,
        accountId,
        nextRefresh: tokenExpiry.toISOString()
      });

      await this.queueRefresh(accountId, tokenExpiry);
    } catch (error: any) {
      logger.error({
        event: 'refresh_failed',
        platform: account.platform,
        accountId,
        error: error.message
      });

      if (error.response?.data?.error === 'invalid_grant') {
        await prisma.socialAccount.delete({
          where: { id: accountId }
        });
      } else {
        await prisma.socialAccount.update({
          where: { id: accountId },
          data: { status: 'ERROR' }
        });
      }

      throw new OAuthError(
        `Token refresh failed: ${error.message}`,
        'REFRESH_FAILED'
      );
    }
  }

  async getPinterestBoards(accountId: string): Promise<any[]> {
    const account = await prisma.socialAccount.findUnique({
      where: { id: accountId }
    });

    if (!account || account.platform !== 'PINTEREST') {
      throw new Error('Invalid account for Pinterest boards');
    }

    const encryptedToken = JSON.parse(account.accessToken);
    const accessToken = tokenCrypto.decrypt(encryptedToken);

    const response = await axios.get('https://api.pinterest.com/v5/boards', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    return response.data.items;
  }

  async revokeAccount(accountId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    const account = await prisma.socialAccount.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      throw new OAuthError('Account not found', 'ACCOUNT_NOT_FOUND', 404);
    }

    if (account.userId !== userId && !isAdmin) {
      throw new OAuthError('Unauthorized', 'UNAUTHORIZED', 403);
    }

    // Try to revoke with platform (best effort)
    try {
      await this.revokeWithPlatform(account.platform, account.accessToken);
    } catch (error) {
      logger.warn({
        event: 'platform_revoke_failed',
        platform: account.platform,
        accountId,
        error: (error as Error).message
      });
    }

    // Completely delete the account instead of just updating status
    await prisma.socialAccount.delete({
      where: { id: accountId }
    });

    logger.info({
      event: 'token_revoked',
      platform: account.platform,
      accountId,
      reason: 'user_request'
    });
  }

  async getAccountStatus(accountId: string): Promise<any> {
    const account = await prisma.socialAccount.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      throw new OAuthError('Account not found', 'ACCOUNT_NOT_FOUND', 404);
    }

    // Check if token expired
    if (account.tokenExpiry < new Date() && account.status === 'CONNECTED') {
      await prisma.socialAccount.update({
        where: { id: accountId },
        data: { status: 'EXPIRED' }
      });
      account.status = 'EXPIRED';
    }

    return sanitizeAccount(account);
  }

  private async exchangeCodeForTokens(
    platform: Platform,
    code: string,
    redirectUri: string,
    codeVerifier?: string
  ): Promise<TokenResponse> {
    const config = getPlatformConfig(platform);
    const clientId = process.env[config.clientIdKey]!;
    const clientSecret = process.env[config.clientSecretKey]!;

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    });

    const headers: Record<string, string> = {
      ...(config.extraTokenExchangeHeaders || {}),
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    if (platform === 'TWITTER' || platform === 'REDDIT') {
      const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${basicAuth}`;
      if (platform === 'TWITTER') {
        body.append('client_id', clientId); 
      }
    } else {
      body.append('client_id', clientId);
      body.append('client_secret', clientSecret);
    }

    if (codeVerifier) {
      body.append('code_verifier', codeVerifier);
    }

    try {
      const response = await axios.post(config.tokenUrl, body.toString(), { headers });

      return response.data as TokenResponse;
    } catch (error: any) {
      logger.error({
        event: 'token_exchange_failed',
        platform,
        error: error.message,
        status: error.response?.status
      });

      throw new OAuthError(
        `Token exchange failed: ${error.message}`,
        'TOKEN_EXCHANGE_ERROR'
      );
    }
  }

  /**
   * Meta-specific Long-Lived Token Exchange
   */
  private async convertToLongLived(platform: Platform, tokenData: TokenResponse): Promise<TokenResponse> {
    const platformStr = String(platform).toUpperCase();
    const config = getPlatformConfig(platform);
    const clientId = process.env[config.clientIdKey]!;
    const clientSecret = process.env[config.clientSecretKey]!;

    if (platformStr === 'FACEBOOK' || platformStr === 'INSTAGRAM') {
      try {
        const response = await axios.get('https://graph.facebook.com/v21.0/oauth/access_token', {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: clientId,
            client_secret: clientSecret,
            fb_exchange_token: tokenData.access_token
          }
        });
        return {
          ...tokenData,
          access_token: response.data.access_token,
          expires_in: response.data.expires_in || tokenData.expires_in,
          token_type: response.data.token_type || tokenData.token_type
        };
      } catch (e: any) {
        logger.warn(`Failed to exchange long-lived token for ${platformStr}: ${e.message}`);
        return tokenData;
      }
    }

    if (platformStr === 'THREADS') {
      try {
        const response = await axios.get('https://graph.threads.net/access_token', {
          params: {
            grant_type: 'th_exchange_token',
            client_secret: clientSecret,
            access_token: tokenData.access_token
          }
        });
        return {
          ...tokenData,
          access_token: response.data.access_token,
          expires_in: response.data.expires_in || tokenData.expires_in,
          token_type: response.data.token_type || tokenData.token_type
        };
      } catch (e: any) {
        logger.warn(`Failed to exchange long-lived token for THREADS: ${e.message}`);
        return tokenData;
      }
    }

    return tokenData;
  }

  private async getExternalAccountId(
    platform: Platform,
    accessToken: string
  ): Promise<Array<{ id: string, name?: string, username?: string, overrideAccessToken?: string }>> {
    logger.debug({ event: 'fetching_external_account_id', platform });
    try {
      const platformStr = String(platform).toUpperCase();
      switch (platformStr) {
        case 'FACEBOOK': {
          const pageResponse = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
            params: { access_token: accessToken }
          });
          
          const accounts: Array<{ id: string, name?: string, overrideAccessToken?: string }> = [];
          
          if (pageResponse.data.data && pageResponse.data.data.length > 0) {
            for (const page of pageResponse.data.data) {
              accounts.push({
                id: page.id,
                name: page.name,
                overrideAccessToken: page.access_token
              });
            }
          } else {
            // Fallback to user profile if no pages
            const response = await axios.get('https://graph.facebook.com/v21.0/me', {
              params: { access_token: accessToken, fields: 'id,name' }
            });
            accounts.push({ id: response.data.id, name: response.data.name });
          }
          return accounts;
        }

        case 'INSTAGRAM': {
          const accounts: Array<{ id: string, name?: string, username?: string }> = [];
          
          try {
            const response = await axios.get(
              'https://graph.facebook.com/v21.0/me',
              {
                params: {
                  fields: 'name,instagram_business_account{id,username}',
                  access_token: accessToken
                }
              }
            );
            const businessAccount = response.data.instagram_business_account;
            if (businessAccount) {
              accounts.push({ id: businessAccount.id, name: response.data.name, username: businessAccount.username });
            }
          } catch (e) {
            logger.warn('Direct Instagram check failed, trying Pages fallback');
          }

          // Fallback: Check Pages for linked Instagram accounts
          const pagesResponse = await axios.get('https://graph.facebook.com/v21.0/me/accounts', {
            params: { 
              access_token: accessToken,
              fields: 'id,name,instagram_business_account{id,username}'
            }
          });

          for (const page of pagesResponse.data.data) {
            if (page.instagram_business_account) {
              // Avoid duplicates if /me already found it
              if (!accounts.some(a => a.id === page.instagram_business_account.id)) {
                accounts.push({ 
                  id: page.instagram_business_account.id, 
                  name: page.name, 
                  username: page.instagram_business_account.username 
                });
              }
            }
          }

          if (accounts.length === 0) {
            // Final fallback to user profile
            const userResponse = await axios.get('https://graph.facebook.com/v21.0/me', {
              params: { access_token: accessToken, fields: 'id,name' }
            });
            accounts.push({ id: userResponse.data.id, name: userResponse.data.name });
          }
          
          return accounts;
        }

        case 'LINKEDIN': {
          const response = await axios.get(
            'https://api.linkedin.com/v2/userinfo',
            {
              headers: { Authorization: `Bearer ${accessToken}` }
            }
          );
          return [{ id: response.data.sub, name: response.data.name }];
        }

        case 'TWITTER': {
          const response = await axios.get('https://api.twitter.com/2/users/me', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          return [{ id: response.data.data.id, name: response.data.data.name, username: response.data.data.username }];
        }

        case 'TIKTOK': {
          const response = await axios.get(
            'https://open.tiktokapis.com/v2/user/info/',
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              params: { fields: 'open_id,display_name' }
            }
          );
          return [{ id: response.data.data.open_id, name: response.data.data.display_name }];
        }

        case 'YOUTUBE': {
          const response = await axios.get(
            'https://www.googleapis.com/youtube/v3/channels',
            {
              headers: { Authorization: `Bearer ${accessToken}` },
              params: { part: 'snippet', mine: true }
            }
          );
          
          if (!response.data.items || response.data.items.length === 0) {
             throw new Error('No YouTube channel found for this Google account. Please create a YouTube channel first.');
          }
          
          const channel = response.data.items[0];
          return [{ id: channel?.id, name: channel?.snippet?.title }];
        }

        case 'THREADS': {
          const response = await axios.get('https://graph.threads.net/v1.0/me', {
            params: { access_token: accessToken, fields: 'id,name,username' }
          });
          return [{ id: response.data.id, name: response.data.name, username: response.data.username }];
        }

        case 'PINTEREST': {
          const response = await axios.get('https://api.pinterest.com/v5/user_account', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          return [{ id: response.data.username, name: response.data.username, username: response.data.username }];
        }

        case 'SNAPCHAT': {
          try {
            const response = await axios.get('https://adsapi.snapchat.com/v1/me', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            const me = response.data.me;
            return [{
              id: me.id || 'snapchat-user',
              name: me.display_name || me.email || 'Snapchat User',
              username: me.email || me.display_name
            }];
          } catch (e: any) {
             throw new Error('Snapchat API failed: ' + (e.response?.data?.error?.message || e.message));
          }
        }

        case 'REDDIT': {
          const response = await axios.get('https://oauth.reddit.com/api/v1/me', {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          return [{ id: response.data.id, name: response.data.name, username: response.data.name }];
        }

        default:
          throw new OAuthError(
            `Unsupported platform: ${platformStr}`,
            'UNSUPPORTED_PLATFORM'
          );
      }
    } catch (error: any) {
      logger.error({
        event: 'external_account_id_failed',
        platform,
        error: error.message
      });
      throw new OAuthError(
        `Failed to fetch external account ID: ${error.message}`,
        'EXTERNAL_ACCOUNT_ERROR'
      );
    }
  }

  private async revokeWithPlatform(
    platform: Platform,
    encryptedToken: string
  ): Promise<void> {
    const token = tokenCrypto.decrypt(JSON.parse(encryptedToken));

    // Platform-specific revoke endpoints
    let revokeUrl: string;
    switch (platform) {
      case 'YOUTUBE':
        revokeUrl = 'https://oauth2.googleapis.com/revoke';
        break;
      case 'LINKEDIN':
        revokeUrl = 'https://www.linkedin.com/oauth/v2/revoke';
        break;
      default:
        // Some platforms don't support programmatic revation
        return;
    }

    await axios.post(revokeUrl, null, {
      params: { token }
    });
  }
  private async queueRefresh(accountId: string, tokenExpiry: Date): Promise<void> {
    // Refresh 5 minutes BEFORE expiry
    const refreshTime = tokenExpiry.getTime() - 5 * 60 * 1000;
    await redis.zadd('token_refresh_queue', refreshTime, accountId);
    
    logger.debug({
      event: 'account_queued_for_refresh',
      accountId,
      refreshAt: new Date(refreshTime).toISOString()
    });
  }
}

export const oauthService = new OAuthService();
