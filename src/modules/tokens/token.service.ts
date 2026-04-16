import { prisma } from '../../db/prisma.js';
import { redis } from '../../db/redis.js';
import { logger } from '../../logger/pino.js';
import { tokenCrypto } from '../../crypto/token-crypto.service.js';
import { sanitizeAccount } from '../../utils/helpers.js';
import type { Platform, AccountStatus } from '@prisma/client';

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  scope?: string;
}

export class TokenService {
  async storeToken(
    userId: string,
    platform: Platform,
    externalAccountId: string,
    tokenData: TokenData
  ): Promise<any> {
    const encryptedAccess = tokenCrypto.encrypt(tokenData.accessToken);
    const encryptedRefresh = tokenData.refreshToken
      ? tokenCrypto.encrypt(tokenData.refreshToken)
      : null;

    const tokenExpiry = new Date(Date.now() + tokenData.expiresIn * 1000);

    const account = await prisma.socialAccount.upsert({
      where: {
        userId_platform_externalAccountId: {
          userId,
          platform,
          externalAccountId
        }
      },
      update: {
        accessToken: JSON.stringify(encryptedAccess),
        refreshToken: encryptedRefresh ? JSON.stringify(encryptedRefresh) : null,
        tokenExpiry,
        scopes: tokenData.scope?.split(' ') || [],
        status: 'CONNECTED' as AccountStatus,
        lastRefreshed: new Date()
      },
      create: {
        userId,
        platform,
        externalAccountId,
        accessToken: JSON.stringify(encryptedAccess),
        refreshToken: encryptedRefresh ? JSON.stringify(encryptedRefresh) : null,
        tokenExpiry,
        scopes: tokenData.scope?.split(' ') || [],
        status: 'CONNECTED' as AccountStatus
      }
    });

    logger.info({
      event: 'token_stored',
      platform,
      userId,
      accountId: account.id,
      hasRefreshToken: !!tokenData.refreshToken
    });

    return sanitizeAccount(account);
  }

  async getDecryptedToken(accountId: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    tokenExpiry: Date;
    platform: Platform;
  }> {
    const account = await prisma.socialAccount.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const encryptedAccess = JSON.parse(account.accessToken);
    const accessToken = tokenCrypto.decrypt(encryptedAccess);

    let refreshToken: string | undefined;
    if (account.refreshToken) {
      const encryptedRefresh = JSON.parse(account.refreshToken);
      refreshToken = tokenCrypto.decrypt(encryptedRefresh);
    }

    return {
      accessToken,
      refreshToken,
      tokenExpiry: account.tokenExpiry,
      platform: account.platform
    };
  }

  async scheduleRefresh(accountId: string, tokenExpiry: Date): Promise<void> {
    // Schedule refresh 5 minutes before expiry
    const refreshTime = tokenExpiry.getTime() - 5 * 60 * 1000;
    const score = refreshTime;

    await redis.zadd('token_refresh_queue', score, accountId);

    logger.debug({
      event: 'refresh_scheduled',
      accountId,
      refreshAt: new Date(refreshTime).toISOString()
    });
  }

  async getExpiredTokens(): Promise<any[]> {
    const now = new Date();

    const accounts = await prisma.socialAccount.findMany({
      where: {
        tokenExpiry: {
          lt: now
        },
        status: 'CONNECTED' as AccountStatus
      }
    });

    return accounts;
  }

  async removeRefreshQueue(accountId: string): Promise<void> {
    await redis.zrem('token_refresh_queue', accountId);
  }
}

export const tokenService = new TokenService();
