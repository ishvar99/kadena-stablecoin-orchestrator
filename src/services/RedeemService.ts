import { ethers } from 'ethers';
import { config } from '../config';
import logger from '../logger';
import { AwsKmsSigner } from '../signers/AwsKmsSigner';
import { contractManager } from '../contracts';
import { dbService } from '../db';
import { RedeemFinalize, RedeemRequestedEvent, TransactionResult } from '../types';
import { QueueService } from './QueueService';

export class RedeemService {
  private signer: AwsKmsSigner;
  private queueService: QueueService;

  constructor(queueService: QueueService) {
    this.signer = new AwsKmsSigner();
    this.queueService = queueService;
  }

  /**
   * Process a redeem request from EVM
   */
  async processRedeemRequest(event: RedeemRequestedEvent): Promise<void> {
    const { requestId, from, amount } = event;
    
    logger.info('Processing redeem request', { requestId, from, amount: amount.toString(), chainId: config.chainId });

    try {
      // Check if request already exists (idempotency)
      const existingRequest = await dbService.getRequest(requestId);
      if (existingRequest) {
        logger.warn('Redeem request already exists', { requestId, status: existingRequest.status });
        return;
      }

      // Create initial database record
      await dbService.upsertRequest({
        requestId,
        type: 'REDEEM',
        status: 'PENDING',
        userAddress: from,
        amount: amount.toString(),
        chainId: config.chainId,
      });

      // Add to processing queue
      await this.queueService.addRedeemJob(event);
      
      logger.info('Redeem request queued for processing', { requestId });
    } catch (error) {
      logger.error('Error processing redeem request', { requestId, error: error instanceof Error ? error.message : String(error) });
      
      // Update database with error
      await dbService.updateRequestStatus(requestId, 'FAILED', undefined, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Process a redeem request (the actual redeem happens when user calls requestRedeem)
   * This service just logs and tracks the event
   */
  async executeRedeem(event: RedeemRequestedEvent): Promise<TransactionResult> {
    const { requestId, from, amount } = event;
    
    try {
      // Update status to processing
      await dbService.updateRequestStatus(requestId, 'PROCESSING');

      logger.info('Processing redeem request event', { 
        requestId, 
        from, 
        amount: amount.toString(), 
        chainId: config.chainId
      });

      // The actual redeem (burn) has already happened when the user called requestRedeem
      // This service just processes the event and updates the database
      
      // Update database with success
      await dbService.updateRequestStatus(requestId, 'COMPLETED');

      logger.info('Redeem request processed successfully', { 
        requestId, 
        from, 
        amount: amount.toString()
      });

      return {
        success: true,
        message: 'Redeem request processed successfully'
      };
    } catch (error) {
      logger.error('Error processing redeem request', { requestId, error: error instanceof Error ? error.message : String(error) });
      
      // Update database with error
      await dbService.updateRequestStatus(requestId, 'FAILED', undefined, error instanceof Error ? error.message : String(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Update request status (called by event listeners)
   */
  async updateRequestStatus(
    requestId: string, 
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    txHash?: string,
    errorMessage?: string
  ): Promise<void> {
    await dbService.updateRequestStatus(requestId, status, txHash, errorMessage);
  }

  /**
   * Get redeem request status
   */
  async getRedeemStatus(requestId: string) {
    return dbService.getRequest(requestId);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.signer.healthCheck();
      return result.healthy;
    } catch (error) {
      logger.error('Redeem service health check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }
}
