import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { WebhookDeliveryService } from '../services/webhook-delivery.service.js';
import crypto from 'crypto';

const router = Router();

const webhookSchema = z.object({
  endpointUrl: z.string().url(),
  events: z.array(z.string()).min(1),
});

const testSchema = z.object({
  endpointUrl: z.string().url(),
});

router.get('/subscriptions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const subscriptions = await prisma.webhookSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        endpointUrl: true,
        events: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ subscriptions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch subscriptions';
    res.status(500).json({ error: message });
  }
});

router.post('/subscriptions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const validation = webhookSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const { endpointUrl, events } = validation.data;

    const secret = crypto.randomBytes(32).toString('hex');

    const subscription = await prisma.webhookSubscription.create({
      data: {
        userId,
        endpointUrl,
        events,
        secret,
        isActive: true,
      },
    });

    res.status(201).json({
      id: subscription.id,
      endpointUrl: subscription.endpointUrl,
      events: subscription.events,
      isActive: subscription.isActive,
      secret: subscription.secret,
      message: 'Store this secret securely - it will not be shown again',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create subscription';
    res.status(500).json({ error: message });
  }
});

router.delete('/subscriptions/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const subscription = await prisma.webhookSubscription.findFirst({
      where: { id, userId },
    });

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    await prisma.webhookSubscription.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Subscription deactivated' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete subscription';
    res.status(500).json({ error: message });
  }
});

router.post('/test', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const validation = testSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({ error: 'Invalid endpoint URL' });
      return;
    }

    const { endpointUrl } = validation.data;

    const result = await WebhookDeliveryService.testEndpoint(userId, endpointUrl);

    res.json({
      success: result.success,
      statusCode: result.statusCode,
      error: result.error,
      attempts: result.attempts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Test failed';
    res.status(500).json({ error: message });
  }
});

router.get('/logs', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { limit, offset } = req.query;

    const logs = await prisma.notificationLog.findMany({
      where: {
        userId,
        type: 'WEBHOOK',
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string) || 20,
      skip: parseInt(offset as string) || 0,
    });

    res.json({ logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch logs';
    res.status(500).json({ error: message });
  }
});

export const webhookRoutes = router;