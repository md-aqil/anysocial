import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { oauthService } from './oauth.service.js';
import { prisma } from '../../db/prisma.js';
import { Platform } from '@prisma/client';
import { OAuthError } from '../../errors/oauth.error.js';
import { platformConfigs } from '../../config/platforms.js';

function logToFile(message: string) {
  const logPath = path.join(process.cwd(), 'scratch', 'backend-debug.log');
  const timestamp = new Date().toISOString();
  if (!fs.existsSync(path.dirname(logPath))) {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
  }
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

export class OAuthController {
  async getConfig(req: Request, res: Response): Promise<void> {
    const configuredPlatforms = Object.keys(Platform).filter((platform) => {
      const config = platformConfigs[platform as keyof typeof platformConfigs];
      if (!config) return false;
      return !!process.env[config.clientIdKey];
    });
    res.json({ configuredPlatforms });
  }
  async connect(req: Request, res: Response): Promise<void> {
    try {
      const { platform } = req.params;
      const userId = (req as any).userId;

      // Validate platform
      if (!Object.values(Platform).includes(platform.toUpperCase() as Platform)) {
        throw new OAuthError(`Unsupported platform: ${platform}`, 'UNSUPPORTED_PLATFORM');
      }

      const redirectUri = `${process.env.BASE_URL}/oauth/${platform.toLowerCase()}/callback`;

      const { authUrl, state } = await oauthService.generateAuthUrl(
        platform.toUpperCase() as Platform,
        userId,
        redirectUri
      );

      res.json({ authUrl, state });
    } catch (error) {
      if (error instanceof OAuthError) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async callback(req: Request, res: Response): Promise<void> {
    const { platform } = req.params;
    const { code, state, error, error_description } = req.query;

    const logMsg = `CALLBACK: platform=${platform}, code=${code ? 'PRESENT' : 'MISSING'}, state=${state}, error=${error || 'NONE'}`;
    logToFile(logMsg);
    console.log('\n\n' + '='.repeat(50));
    console.log('<<<< OAUTH CALLBACK RECEIVED >>>>');
    console.log(`Platform: ${platform}`);
    console.log(`Code: ${code ? 'PRESENT' : 'MISSING'}`);
    console.log(`State: ${state}`);
    console.log(`Error: ${error || 'NONE'}`);
    console.log(`Error Desc: ${error_description || 'NONE'}`);
    console.log('='.repeat(50) + '\n\n');

    try {
      if (error) {
        throw new OAuthError(`OAuth denied: ${error_description || error}`, 'OAUTH_DENIED');
      }

      if (!code || !state) {
        throw new OAuthError(`Missing code or state (Code: ${!!code}, State: ${!!state})`, 'MISSING_PARAMS');
      }

      const redirectUri = `${process.env.BASE_URL}/oauth/${platform.toLowerCase()}/callback`;

      const result = await oauthService.handleCallback(
        platform.toUpperCase() as Platform,
        code as string,
        state as string,
        redirectUri
      );

      const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000';
      
      if (result.needsSelection) {
        res.redirect(`${frontendUrl}/dashboard/social-accounts?status=select&state=${state}&platform=${platform}`);
      } else {
        res.redirect(`${frontendUrl}/dashboard/social-accounts?status=success`);
      }
    } catch (error: any) {
      const axiosError = error.response?.data?.error?.message || error.message || error;
      logToFile(`ERROR: ${axiosError}`);
      console.error('!!!! OAUTH CALLBACK FAILED !!!!');
      console.error(error);
      
      const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000';
      const message = error instanceof OAuthError ? error.message : 'Internal_Server_Error';
      res.redirect(`${frontendUrl}/dashboard/social-accounts?status=error&message=${encodeURIComponent(message)}`);
    }
  }

  async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;

      // Verify ownership
      const account = await prisma.socialAccount.findUnique({
        where: { id }
      });

      if (!account) {
        throw new OAuthError('Account not found', 'ACCOUNT_NOT_FOUND', 404);
      }

      if (account.userId !== userId) {
        throw new OAuthError('Unauthorized', 'UNAUTHORIZED', 403);
      }

      await oauthService.refreshToken(id);

      res.json({ success: true, message: 'Token refreshed' });
    } catch (error) {
      if (error instanceof OAuthError) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async revoke(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;

      await oauthService.revokeAccount(id, userId);

      res.json({ success: true, message: 'Account revoked' });
    } catch (error) {
      if (error instanceof OAuthError) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async status(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const account = await oauthService.getAccountStatus(id);

      res.json(account);
    } catch (error) {
      if (error instanceof OAuthError) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async listAccounts(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;

      const accounts = await prisma.socialAccount.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      // Sanitize accounts (remove tokens)
      const sanitized = accounts.map((account: any) => {
        const { accessToken, refreshToken, ...rest } = account;
        return rest;
      });

      res.json({ accounts: sanitized });
    } catch (error) {
      if (error instanceof OAuthError) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  async getPendingAccounts(req: Request, res: Response): Promise<void> {
    try {
      const { stateToken } = req.params;
      logToFile(`FETCH PENDING: stateToken=${stateToken}`);
      const oauthState = await prisma.oAuthState.findUnique({
        where: { stateToken }
      });

      if (!oauthState || !oauthState.pendingData) {
        logToFile(`ERROR: Pending data not found for state ${stateToken}`);
        throw new OAuthError('Pending connection not found', 'NOT_FOUND', 404);
      }

      const { accountInfos } = oauthState.pendingData as any;
      logToFile(`SUCCESS: Found ${accountInfos.length} pending accounts for ${oauthState.platform}`);
      
      res.json({
        platform: oauthState.platform,
        accounts: accountInfos.map((info: any) => ({
          id: info.id,
          name: info.name,
          username: info.username
        }))
      });
    } catch (error: any) {
      logToFile(`ERROR during getPendingAccounts: ${error.message}`);
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }

  async confirmSelection(req: Request, res: Response): Promise<void> {
    try {
      const { stateToken } = req.params;
      const { accountIds } = req.body;
      logToFile(`CONFIRM SELECTION: stateToken=${stateToken}, count=${accountIds?.length}`);

      if (!accountIds || !Array.isArray(accountIds)) {
        throw new OAuthError('Account IDs are required', 'BAD_REQUEST', 400);
      }

      const accounts = await oauthService.confirmSelection(stateToken, accountIds);
      logToFile(`SUCCESS: Connected ${accounts.length} selected accounts`);
      res.json({ success: true, accounts });
    } catch (error: any) {
      logToFile(`ERROR during confirmSelection: ${error.message}`);
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  }
}

export const oauthController = new OAuthController();
