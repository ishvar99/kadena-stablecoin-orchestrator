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
    const { requestId, from, amount, chainId } = event;
    
    logger.info('Processing redeem request', { requestId, from, amount: amount.toString(), chainId });

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
        chainId,
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
   * Execute the actual redeem finalization transaction
   */
  async executeRedeem(event: RedeemRequestedEvent): Promise<TransactionResult> {
    const { requestId, from, amount, chainId } = event;
    
    logger.info('Executing redeem transaction', { requestId, from, amount: amount.toString(), chainId });

    try {
      // Update status to processing
      await dbService.updateRequestStatus(requestId, 'PROCESSING');

      // Get contract and wallet
      const contract = contractManager.getContract(chainId, 'stablecoin') as any;
      const wallet = contractManager.getWallet(chainId);

      // Get next nonce for the relayer address
      const nonce = await dbService.getNextNonce(wallet.address, chainId);
      
      // Set deadline (24 hours from now)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60);
      
      // Prepare redeem finalize data
      const redeemData: RedeemFinalize = {
        requestId,
        from,
        amount,
        nonce,
        deadline,
      };

      // Sign the redeem finalize
      const signature = await this.signer.signRedeemFinalize(redeemData, chainId);
      
      logger.debug('Redeem finalize signed', { requestId, signature });

      // Connect wallet to contract
      const contractWithSigner = contract.connect(wallet);

      // Estimate gas
      const gasEstimate = await contractWithSigner.finalizeRedeem.estimateGas(
        requestId,
        from,
        amount,
        nonce,
        deadline,
        signature
      );

      // Execute redeem transaction
      const tx = await contractWithSigner.finalizeRedeem(
        requestId,
        from,
        amount,
        nonce,
        deadline,
        signature,
        {
          gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
        }
      );

      logger.info('Redeem transaction submitted', { requestId, txHash: tx.hash });

      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        logger.info('Redeem transaction confirmed', { 
          requestId, 
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        });

        // Update database with success
        await dbService.updateRequestStatus(requestId, 'COMPLETED', tx.hash);

        return {
          hash: tx.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
        };
      } else {
        throw new Error('Redeem transaction failed');
      }
    } catch (error) {
      logger.error('Error executing redeem transaction', { requestId, error: error instanceof Error ? error.message : String(error) });
      
      // Update database with error
      await dbService.updateRequestStatus(requestId, 'FAILED', undefined, error instanceof Error ? error.message : String(error));
      throw error;
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
