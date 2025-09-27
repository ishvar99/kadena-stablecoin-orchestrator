import { PrismaClient } from '@prisma/client';
import logger from '../logger';

export const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Database query', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  }
});

prisma.$on('error', (e) => {
  logger.error('Database error', { error: e.message });
});

export class DatabaseService {
  /**
   * Create or update a request record
   */
  async upsertRequest(requestData: {
    requestId: string;
    type: 'MINT' | 'REDEEM';
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    userAddress: string;
    amount: string;
    chainId: number;
    txHash?: string;
    errorMessage?: string;
    fiatRef?: string;
  }) {
    return prisma.requestRecord.upsert({
      where: { requestId: requestData.requestId },
      update: {
        status: requestData.status,
        txHash: requestData.txHash,
        errorMessage: requestData.errorMessage,
        updatedAt: new Date(),
      },
      create: {
        requestId: requestData.requestId,
        type: requestData.type,
        status: requestData.status,
        userAddress: requestData.userAddress,
        amount: requestData.amount,
        chainId: requestData.chainId,
        txHash: requestData.txHash,
        errorMessage: requestData.errorMessage,
        fiatRef: requestData.fiatRef,
      },
    });
  }

  /**
   * Get a request by requestId
   */
  async getRequest(requestId: string) {
    return prisma.requestRecord.findUnique({
      where: { requestId },
    });
  }

  /**
   * Update request status
   */
  async updateRequestStatus(
    requestId: string,
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    txHash?: string,
    errorMessage?: string
  ) {
    return prisma.requestRecord.update({
      where: { requestId },
      data: {
        status,
        txHash,
        errorMessage,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get next nonce for an address on a specific chain
   */
  async getNextNonce(address: string, chainId: number): Promise<bigint> {
    const result = await prisma.nonce.upsert({
      where: {
        address_chainId: {
          address,
          chainId,
        },
      },
      update: {
        nonce: { increment: 1 },
      },
      create: {
        address,
        chainId,
        nonce: 1,
      },
    });

    return result.nonce;
  }

  /**
   * Record health check
   */
  async recordHealthCheck(service: string, status: string, details?: any) {
    return prisma.healthCheck.create({
      data: {
        service,
        status,
        details,
      },
    });
  }

  /**
   * Get recent health checks
   */
  async getRecentHealthChecks(limit: number = 10) {
    return prisma.healthCheck.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
    });
  }

  /**
   * Database health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  /**
   * Graceful shutdown
   */
  async disconnect() {
    await prisma.$disconnect();
  }
}

export const dbService = new DatabaseService();
