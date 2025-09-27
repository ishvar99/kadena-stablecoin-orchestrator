import { ethers } from 'ethers';
import { config } from '../config';
import logger from '../logger';
import { RedeemRequestedEvent } from '../types';
import { contractManager } from '../contracts';
import { RedeemService } from '../services/RedeemService';

export class EVMListener {
  private provider!: ethers.JsonRpcProvider;
  private contract!: any;
  private isListening = false;
  private redeemService: RedeemService;

  constructor(redeemService: RedeemService) {
    this.redeemService = redeemService;
    this.initializeProvider();
    this.initializeContract();
  }

  private initializeProvider(): void {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
  }

  private initializeContract(): void {
    this.contract = contractManager.getContract('stablecoin');
  }

  /**
   * Start listening to EVM events
   */
  async start(): Promise<void> {
    if (this.isListening) {
      logger.warn('EVM listener is already running');
      return;
    }

    logger.info('Starting EVM event listener');
    this.isListening = true;

    await this.startListener();
  }

  private async startListener(): Promise<void> {
    try {
      logger.info('Starting EVM listener');

      // Listen for RedeemRequested events
      this.contract.on('RedeemRequested', async (requestId: string, from: string, amount: bigint, event: ethers.Log) => {
        try {
          const block = await this.provider.getBlock(event.blockNumber);
          
          const redeemEvent: RedeemRequestedEvent = {
            requestId,
            from,
            amount,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            chainId: config.chainId,
          };

          logger.info('Received RedeemRequested event', { 
            requestId, 
            from, 
            amount: amount.toString(),
            chainId: config.chainId 
          });

          await this.redeemService.processRedeemRequest(redeemEvent);
        } catch (error) {
          logger.error('Error processing RedeemRequested event', { 
            requestId, 
            chainId: config.chainId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      // Also listen for Minted events for tracking
      this.contract.on('Minted', async (requestId: string, to: string, amount: bigint, event: ethers.Log) => {
        try {
          logger.info('Minted event received', { 
            requestId, 
            to, 
            amount: amount.toString(),
            chainId: config.chainId,
            txHash: event.transactionHash 
          });

          // Update database record
          await this.redeemService.updateRequestStatus(requestId, 'COMPLETED', event.transactionHash);
        } catch (error) {
          logger.error('Error processing Minted event', { 
            requestId, 
            chainId: config.chainId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      // Listen for Redeemed events
      this.contract.on('Redeemed', async (requestId: string, from: string, amount: bigint, event: ethers.Log) => {
        try {
          logger.info('Redeemed event received', { 
            requestId, 
            from, 
            amount: amount.toString(),
            chainId: config.chainId,
            txHash: event.transactionHash 
          });

          // Update database record
          await this.redeemService.updateRequestStatus(requestId, 'COMPLETED', event.transactionHash);
        } catch (error) {
          logger.error('Error processing Redeemed event', { 
            requestId, 
            chainId: config.chainId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      logger.info('EVM listener started');
    } catch (error) {
      logger.error('Failed to start EVM listener', { error: error instanceof Error ? error.message : String(error) });
    }
  }


  /**
   * Stop listening to events
   */
  async stop(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    logger.info('Stopping EVM event listeners');
    this.isListening = false;

    // Remove all listeners
    this.contract.removeAllListeners();

    logger.info('EVM event listeners stopped');
  }

  /**
   * Health check for chain connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber();
      return true;
    } catch (error) {
      logger.error('Health check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }
}
