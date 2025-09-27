import { Router } from 'express';
import { Request, Response } from 'express';
import { dbService } from '../db';
import { contractManager } from '../contracts';
import { AwsKmsSigner } from '../signers/AwsKmsSigner';
import logger from '../logger';
import { HealthStatus } from '../types';
import { config } from '../config';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Check database
    const dbHealthy = await dbService.healthCheck();

    // Check KMS (sign + verify test payload)
    const signer = new AwsKmsSigner();
    const { healthy: kmsHealthy, recoveredAddress } = await signer.healthCheck();

    // Check Redis (stubbed for now)
    const redisHealthy = true; // TODO: real Redis check

    // Check Kadena EVM chain
    const chainHealthy = await contractManager.healthCheck();

    const overallHealthy = dbHealthy && kmsHealthy && redisHealthy && chainHealthy;

    // Format chain status
    const chainHealthFormatted: Record<number, 'up' | 'down'> = {
      [config.chainId]: chainHealthy ? 'up' : 'down'
    };

    const healthStatus: HealthStatus = {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp: Date.now(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        kms: kmsHealthy ? 'up' : 'down',
        redis: redisHealthy ? 'up' : 'down',
        chains: chainHealthFormatted,
      },
      extra: {
        kmsRecoveredAddress: recoveredAddress, // 👈 log which signer address KMS produced
      },
      uptime: process.uptime(),
    };

    const statusCode = overallHealthy ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', { error: error instanceof Error ? error.message : String(error) });

    const healthStatus: HealthStatus = {
      status: 'unhealthy',
      timestamp: Date.now(),
      services: {
        database: 'down',
        kms: 'down',
        redis: 'down',
        chains: {},
      },
      uptime: process.uptime(),
    };

    res.status(503).json(healthStatus);
  }
});

/**
 * Readiness probe endpoint
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const dbHealthy = await dbService.healthCheck();
    const signer = new AwsKmsSigner();
    const { healthy: kmsHealthy } = await signer.healthCheck();

    if (dbHealthy && kmsHealthy) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    logger.error('Readiness check failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(503).json({ status: 'not ready' });
  }
});

/**
 * Liveness probe endpoint
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive', uptime: process.uptime() });
});

export default router;
