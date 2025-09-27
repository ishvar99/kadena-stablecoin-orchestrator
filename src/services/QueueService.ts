import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { config } from '../config';
import logger from '../logger';
import { MintRequest } from './MintService';
import { RedeemRequestedEvent } from '../types';

export class QueueService {
  private redis: Redis;
  private mintQueue!: Queue;
  private redeemQueue!: Queue;
  private mintWorker!: Worker;
  private redeemWorker!: Worker;

  constructor(
    private mintService: any, // Circular dependency, will be injected
    private redeemService: any // Circular dependency, will be injected
  ) {
    this.redis = new Redis(config.redisUrl);
    this.initializeQueues();
    this.initializeWorkers();
  }

  private initializeQueues(): void {
    // Mint queue
    this.mintQueue = new Queue('mint-requests', {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });

    // Redeem queue
    this.redeemQueue = new Queue('redeem-requests', {
      connection: this.redis,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });
  }

  private initializeWorkers(): void {
    // Mint worker
    this.mintWorker = new Worker(
      'mint-requests',
      async (job: Job<MintRequest>) => {
        logger.info('Processing mint job', { jobId: job.id, data: job.data });
        return await this.mintService.executeMint(job.data);
      },
      {
        connection: this.redis,
        concurrency: 5,
      }
    );

    // Redeem worker
    this.redeemWorker = new Worker(
      'redeem-requests',
      async (job: Job<RedeemRequestedEvent>) => {
        logger.info('Processing redeem job', { jobId: job.id, data: job.data });
        return await this.redeemService.executeRedeem(job.data);
      },
      {
        connection: this.redis,
        concurrency: 5,
      }
    );

    // Set up error handling
    this.mintWorker.on('completed', (job) => {
      logger.info('Mint job completed', { jobId: job.id });
    });

    this.mintWorker.on('failed', (job, err) => {
      logger.error('Mint job failed', { jobId: job?.id, error: err.message });
    });

    this.redeemWorker.on('completed', (job) => {
      logger.info('Redeem job completed', { jobId: job.id });
    });

    this.redeemWorker.on('failed', (job, err) => {
      logger.error('Redeem job failed', { jobId: job?.id, error: err.message });
    });
  }

  /**
   * Add a mint job to the queue
   */
  async addMintJob(mintRequest: MintRequest): Promise<void> {
    await this.mintQueue.add('mint', mintRequest, {
      jobId: mintRequest.requestId, // Ensure idempotency
    });
    
    logger.info('Mint job added to queue', { requestId: mintRequest.requestId });
  }

  /**
   * Add a redeem job to the queue
   */
  async addRedeemJob(redeemEvent: RedeemRequestedEvent): Promise<void> {
    await this.redeemQueue.add('redeem', redeemEvent, {
      jobId: redeemEvent.requestId, // Ensure idempotency
    });
    
    logger.info('Redeem job added to queue', { requestId: redeemEvent.requestId });
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [mintWaiting, mintActive, mintCompleted, mintFailed] = await Promise.all([
      this.mintQueue.getWaiting(),
      this.mintQueue.getActive(),
      this.mintQueue.getCompleted(),
      this.mintQueue.getFailed(),
    ]);

    const [redeemWaiting, redeemActive, redeemCompleted, redeemFailed] = await Promise.all([
      this.redeemQueue.getWaiting(),
      this.redeemQueue.getActive(),
      this.redeemQueue.getCompleted(),
      this.redeemQueue.getFailed(),
    ]);

    return {
      mint: {
        waiting: mintWaiting.length,
        active: mintActive.length,
        completed: mintCompleted.length,
        failed: mintFailed.length,
      },
      redeem: {
        waiting: redeemWaiting.length,
        active: redeemActive.length,
        completed: redeemCompleted.length,
        failed: redeemFailed.length,
      },
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch (error) {
      logger.error('Queue service health check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down queue service');
    
    await Promise.all([
      this.mintWorker.close(),
      this.redeemWorker.close(),
      this.mintQueue.close(),
      this.redeemQueue.close(),
      this.redis.disconnect(),
    ]);
    
    logger.info('Queue service shutdown complete');
  }
}
