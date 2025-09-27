import { Router } from 'express';
import { Request, Response } from 'express';
import logger from '../logger';

const router = Router();

/**
 * Basic metrics endpoint (for monitoring)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const metrics = {
      timestamp: Date.now(),
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
      },
      cpu: {
        usage: process.cpuUsage(),
      },
      requests: {
        // These would be tracked by middleware in a real implementation
        total: 0,
        successful: 0,
        failed: 0,
      },
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Error getting metrics', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Queue metrics endpoint
 */
router.get('/queues', async (req: Request, res: Response) => {
  try {
    // This would need to be injected from the queue service
    // For now, return a placeholder
    const queueMetrics = {
      timestamp: Date.now(),
      mint: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      },
      redeem: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
      },
    };

    res.json(queueMetrics);
  } catch (error) {
    logger.error('Error getting queue metrics', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
