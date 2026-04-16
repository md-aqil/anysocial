import { Router } from 'express';
import { oauthController } from './oauth.controller.js';
import { jwtAuth } from '../../middleware/jwt-auth.js';
import { oauthRateLimiter } from '../../middleware/rate-limiter.js';

const router = Router();

// Get configured platforms (no auth needed)
router.get('/config', oauthController.getConfig.bind(oauthController));

// Handle OAuth callback (this comes from Facebook, so no JWT is present)
router.get('/:platform/callback', oauthController.callback.bind(oauthController));

// All routes below require rate limiting
router.use(oauthRateLimiter);

// Selection flow - allow these without JWT since they use a unique stateToken
router.get('/pending/:stateToken', oauthController.getPendingAccounts.bind(oauthController));
router.post('/confirm/:stateToken', oauthController.confirmSelection.bind(oauthController));

// All routes below require authentication
router.use(jwtAuth);

// Initiate OAuth flow
router.post('/:platform/connect', oauthController.connect.bind(oauthController));

// Manual token refresh
router.post('/:platform/refresh/:id', oauthController.refresh.bind(oauthController));

// Revoke account
router.delete('/:platform/:id', oauthController.revoke.bind(oauthController));

// Get account status
router.get('/:platform/:id/status', oauthController.status.bind(oauthController));

// List all connected accounts
router.get('/accounts', oauthController.listAccounts.bind(oauthController));

export const oauthRouter = router;
