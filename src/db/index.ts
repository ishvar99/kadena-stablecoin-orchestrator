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
   * Save deployed stablecoin record
   */
  async saveDeployedStablecoin(stablecoin: any): Promise<void> {
    try {
      await prisma.deployedStablecoin.create({
        data: {
          id: stablecoin.id,
          tokenName: stablecoin.tokenName,
          tokenSymbol: stablecoin.tokenSymbol,
          contractAddress: stablecoin.contractAddress,
          deployerAddress: stablecoin.deployerAddress,
          deploymentTxHash: stablecoin.deploymentTxHash,
          blockNumber: stablecoin.blockNumber,
          chainId: stablecoin.chainId,
          isActive: stablecoin.isActive,
        }
      });
      logger.info('Deployed stablecoin saved to database', { 
        contractAddress: stablecoin.contractAddress,
        tokenName: stablecoin.tokenName,
        tokenSymbol: stablecoin.tokenSymbol
      });
    } catch (error) {
      logger.error('Failed to save deployed stablecoin', { 
        error: error instanceof Error ? error.message : String(error),
        contractAddress: stablecoin.contractAddress
      });
      throw error;
    }
  }

  /**
   * Get deployed stablecoin by user and token
   */
  async getDeployedStablecoinByUserAndToken(
    userAddress: string, 
    tokenName: string, 
    tokenSymbol: string
  ): Promise<any | null> {
    try {
      // Note: This is a simplified implementation
      // In a real scenario, you might need to track the user who requested the deployment
      const stablecoin = await prisma.deployedStablecoin.findFirst({
        where: {
          tokenName,
          tokenSymbol,
          isActive: true
        }
      });
      return stablecoin;
    } catch (error) {
      logger.error('Failed to get deployed stablecoin', { 
        error: error instanceof Error ? error.message : String(error),
        userAddress,
        tokenName,
        tokenSymbol
      });
      return null;
    }
  }

  /**
   * Get all active deployed stablecoins
   */
  async getAllActiveStablecoins(): Promise<any[]> {
    try {
      const stablecoins = await prisma.deployedStablecoin.findMany({
        where: {
          isActive: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      return stablecoins;
    } catch (error) {
      logger.error('Failed to get active stablecoins', { 
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Get recent requests
   */
  async getRecentRequests(limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const requests = await prisma.requestRecord.findMany({
        take: limit,
        skip: offset,
        orderBy: {
          createdAt: 'desc'
        }
      });
      return requests;
    } catch (error) {
      logger.error('Failed to get recent requests', { 
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
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
