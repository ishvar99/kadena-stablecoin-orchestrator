import { Router } from 'express';
import { Request, Response } from 'express';
import { dbService } from '../db';
import { contractManager } from '../contracts';
import { AwsKmsSigner } from '../signers/AwsKmsSigner';
import logger from '../logger';
import { HealthStatus } from '../types';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Check database
    const dbHealthy = await dbService.healthCheck();
    
    // Check KMS
    const signer = new AwsKmsSigner();
    const kmsHealthy = await signer.healthCheck();
    
    // Check Redis (through queue service - we'll need to inject this)
    // For now, assume healthy if we can connect to Redis
    const redisHealthy = true; // TODO: Implement proper Redis health check
    
    // Check chain connections
    const chainHealth = await contractManager.healthCheck();
    
    const allChainsHealthy = Object.values(chainHealth).every(status => status);
    
    const overallHealthy = dbHealthy && kmsHealthy && redisHealthy && allChainsHealthy;
    
    const healthStatus: HealthStatus = {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp: Date.now(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        kms: kmsHealthy ? 'up' : 'down',
        redis: redisHealthy ? 'up' : 'down',
        chains: chainHealth,
      },
      uptime: process.uptime(),
    };

    const statusCode = overallHealthy ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    
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
    // Check if all critical services are ready
    const dbHealthy = await dbService.healthCheck();
    const signer = new AwsKmsSigner();
    const kmsHealthy = await signer.healthCheck();
    
    if (dbHealthy && kmsHealthy) {
      res.status(200).json({ status: 'ready' });
    } else {
      res.status(503).json({ status: 'not ready' });
    }
  } catch (error) {
    logger.error('Readiness check failed', { error: error.message });
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
