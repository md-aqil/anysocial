import { Router } from 'express';
import { adminController } from './admin.controller.js';
import { adminAuth } from '../middleware/admin-auth.js';

const router = Router();

// Apply admin authentication to all admin routes
router.use(adminAuth);

router.get('/users', adminController.getUsers);

export const adminRoutes = router;
