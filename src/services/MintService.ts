import { ethers } from 'ethers';
import { config } from '../config';
import logger from '../logger';
import { AwsKmsSigner } from '../signers/AwsKmsSigner';
import { contractManager } from '../contracts';
import { dbService } from '../db';
import { MintApproval, TransactionResult } from '../types';
import { QueueService } from './QueueService';

export interface MintRequest {
  requestId: string;
  user: string;
  amount: string;
  fiatRef: string;
}

export class MintService {
  private signer: AwsKmsSigner;
  private queueService: QueueService;

  constructor(queueService: QueueService) {
    this.signer = new AwsKmsSigner();
    this.queueService = queueService;
  }

  /**
   * Process a mint request from Kuro
   */
  async processMintRequest(request: MintRequest): Promise<void> {
    const { requestId, user, amount, fiatRef } = request;
    
    logger.info('Processing mint request', { requestId, user, amount, fiatRef });

    try {
      // Check if request already exists (idempotency)
      const existingRequest = await dbService.getRequest(requestId);
      if (existingRequest) {
        logger.warn('Mint request already exists', { requestId, status: existingRequest.status });
        return;
      }

      // Create initial database record
      await dbService.upsertRequest({
        requestId,
        type: 'MINT',
        status: 'PENDING',
        userAddress: user,
        amount,
        chainId: config.chainId,
        fiatRef,
      });

      // Add to processing queue
      await this.queueService.addMintJob(request);
      
      logger.info('Mint request queued for processing', { requestId });
    } catch (error) {
      logger.error('Error processing mint request', { requestId, error: error instanceof Error ? error.message : String(error) });
      
      // Update database with error
      await dbService.updateRequestStatus(requestId, 'FAILED', undefined, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Execute the actual mint transaction
   */
  async executeMint(request: MintRequest): Promise<TransactionResult> {
    const { requestId, user, amount, fiatRef } = request;
    
    logger.info('Executing mint transaction', { requestId, user, amount, chainId: config.chainId });

    try {
      // Update status to processing
      await dbService.updateRequestStatus(requestId, 'PROCESSING');

      // Get contract and wallet
      const contract = contractManager.getContract('stablecoin') as any;
      const wallet = contractManager.getWallet();

      // Get next nonce for the relayer address
      const nonce = await dbService.getNextNonce(wallet.address, config.chainId);
      
      // Set deadline (24 hours from now)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60);
      
      // Prepare mint approval data
      const mintData: MintApproval = {
        requestId,
        to: user,
        amount: BigInt(amount),
        nonce,
        deadline,
      };

      // Sign the mint approval
      const signature = await this.signer.signMintApproval(mintData, config.chainId);
      
      logger.debug('Mint approval signed', { requestId, signature });

      // Connect wallet to contract
      const contractWithSigner = contract.connect(wallet);

      // Estimate gas
      const gasEstimate = await contractWithSigner.mintWithApproval.estimateGas(
        requestId,
        user,
        amount,
        nonce,
        deadline,
        signature
      );

      // Execute mint transaction
      const tx = await contractWithSigner.mintWithApproval(
        requestId,
        user,
        amount,
        nonce,
        deadline,
        signature,
        {
          gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
        }
      );

      logger.info('Mint transaction submitted', { requestId, txHash: tx.hash });

      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        logger.info('Mint transaction confirmed', { 
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
        throw new Error('Mint transaction failed');
      }
    } catch (error) {
      logger.error('Error executing mint transaction', { requestId, error: error instanceof Error ? error.message : String(error) });
      
      // Update database with error
      await dbService.updateRequestStatus(requestId, 'FAILED', undefined, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Get mint request status
   */
  async getMintStatus(requestId: string) {
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
      logger.error('Mint service health check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }
}
