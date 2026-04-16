import { Router } from 'express';
import { getPlatformRules, PLATFORM_RULES } from '../config/platform-rules.js';

const router = Router();

/**
 * GET /api/config/platform-rules
 * Get all platform-specific validation rules
 */
router.get('/platform-rules', (_req, res) => {
  res.json(PLATFORM_RULES);
});

/**
 * GET /api/config/platform-rules/:platform
 * Get rules for a specific platform
 */
router.get('/platform-rules/:platform', (req, res) => {
  try {
    const rules = getPlatformRules(req.params.platform.toUpperCase());
    res.json(rules);
  } catch (error) {
    res.status(404).json({ error: 'Platform not found' });
  }
});

export const configRoutes = router;
