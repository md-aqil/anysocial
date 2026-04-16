import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100)
});

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors
      });
      return;
    }

    const { email, password, name } = validation.data;
    const user = await AuthService.register(email, password, name);
    const token = AuthService.generateToken(user);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl
      },
      token
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    if (message.includes('already exists')) {
      res.status(409).json({ error: message });
      return;
    }
    next(error);
  }
});

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors
      });
      return;
    }

    const { email, password } = validation.data;
    const user = await AuthService.login(email, password);
    const token = AuthService.generateToken(user);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl
      },
      token
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';
    if (message.includes('Invalid credentials')) {
      res.status(401).json({ error: message });
      return;
    }
    next(error);
  }
});

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.slice(7);
    const payload = AuthService.verifyToken(token);
    const user = await AuthService.getUserById(payload.userId);

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    if (message.includes('jwt') || message.includes('expired')) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
    next(error);
  }
});

router.put('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const validation = updateProfileSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors
      });
      return;
    }

    const token = authHeader.slice(7);
    const payload = AuthService.verifyToken(token);
    const user = await AuthService.updateProfile(payload.userId, validation.data);

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl
    });
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const validation = changePasswordSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors
      });
      return;
    }

    const token = authHeader.slice(7);
    const payload = AuthService.verifyToken(token);
    await AuthService.changePassword(payload.userId, validation.data.currentPassword, validation.data.newPassword);

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password change failed';
    if (message.includes('incorrect') || message.includes('not found')) {
      res.status(400).json({ error: message });
      return;
    }
    next(error);
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export const authRoutes = router;