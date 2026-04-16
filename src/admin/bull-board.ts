import { Adapters } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { postQueue } from '../queues/post-queue.js';
import { Router } from 'express';

const router = Router();

const createBullBoardAdapter = () => {
  const adapter = new ExpressAdapter();
  
  createBullBoard({
    queues: [
      new Adapters.BullMQ(postQueue),
    ],
    serverAdapter: adapter,
  });
  
  return adapter;
};

let adapter: ExpressAdapter | null = null;

function getAdapter() {
  if (!adapter) {
    adapter = createBullBoardAdapter();
  }
  return adapter;
}

router.use('/queues', (req, res, next) => {
  const isAdmin = (req as any).user?.role === 'admin';
  
  if (!isAdmin) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  
  getAdapter().getRouter()(req, res, next);
});

export const bullBoardRouter = router;