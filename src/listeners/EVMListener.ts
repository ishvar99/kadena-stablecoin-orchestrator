import { ethers } from 'ethers';
import { config } from '../config';
import logger from '../logger';
import { RedeemRequestedEvent } from '../types';
import { contractManager } from '../contracts';
import { RedeemService } from '../services/RedeemService';

export class EVMListener {
  private providers: Record<number, ethers.JsonRpcProvider> = {};
  private contracts: Record<number, any> = {};
  private isListening = false;
  private redeemService: RedeemService;

  constructor(redeemService: RedeemService) {
    this.redeemService = redeemService;
    this.initializeProviders();
    this.initializeContracts();
  }

  private initializeProviders(): void {
    for (const [chainId, chainConfig] of Object.entries(config.chains)) {
      const chainIdNum = parseInt(chainId, 10);
      this.providers[chainIdNum] = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
    }
  }

  private initializeContracts(): void {
    for (const [chainId, chainConfig] of Object.entries(config.chains)) {
      const chainIdNum = parseInt(chainId, 10);
      this.contracts[chainIdNum] = contractManager.getContract(chainIdNum, 'stablecoin');
    }
  }

  /**
   * Start listening to EVM events on all chains
   */
  async start(): Promise<void> {
    if (this.isListening) {
      logger.warn('EVM listener is already running');
      return;
    }

    logger.info('Starting EVM event listeners for all chains');
    this.isListening = true;

    // Start listeners for each chain
    const promises = Object.keys(config.chains).map(chainId => 
      this.startChainListener(parseInt(chainId, 10))
    );

    await Promise.allSettled(promises);
  }

  private async startChainListener(chainId: number): Promise<void> {
    try {
      const contract = this.contracts[chainId];
      const provider = this.providers[chainId];

      logger.info(`Starting EVM listener for chain ${chainId}`);

      // Listen for RedeemRequested events
      contract.on('RedeemRequested', async (requestId: string, from: string, amount: bigint, event: ethers.Log) => {
        try {
          const block = await provider.getBlock(event.blockNumber);
          
          const redeemEvent: RedeemRequestedEvent = {
            requestId,
            from,
            amount,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            chainId,
          };

          logger.info('Received RedeemRequested event', { 
            requestId, 
            from, 
            amount: amount.toString(),
            chainId 
          });

          await this.redeemService.processRedeemRequest(redeemEvent);
        } catch (error) {
          logger.error('Error processing RedeemRequested event', { 
            requestId, 
            chainId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      // Also listen for Minted events for tracking
      contract.on('Minted', async (requestId: string, to: string, amount: bigint, event: ethers.Log) => {
        try {
          logger.info('Minted event received', { 
            requestId, 
            to, 
            amount: amount.toString(),
            chainId,
            txHash: event.transactionHash 
          });

          // Update database record
          await this.redeemService.updateRequestStatus(requestId, 'COMPLETED', event.transactionHash);
        } catch (error) {
          logger.error('Error processing Minted event', { 
            requestId, 
            chainId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      // Listen for Redeemed events
      contract.on('Redeemed', async (requestId: string, from: string, amount: bigint, event: ethers.Log) => {
        try {
          logger.info('Redeemed event received', { 
            requestId, 
            from, 
            amount: amount.toString(),
            chainId,
            txHash: event.transactionHash 
          });

          // Update database record
          await this.redeemService.updateRequestStatus(requestId, 'COMPLETED', event.transactionHash);
        } catch (error) {
          logger.error('Error processing Redeemed event', { 
            requestId, 
            chainId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      logger.info(`EVM listener started for chain ${chainId}`);
    } catch (error) {
      logger.error(`Failed to start EVM listener for chain ${chainId}`, { error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Process historical events (for catching up after downtime)
   */
  async processHistoricalEvents(chainId: number, fromBlock: number, toBlock?: number): Promise<void> {
    try {
      const contract = this.contracts[chainId];
      
      logger.info(`Processing historical events for chain ${chainId}`, { fromBlock, toBlock });

      // Get RedeemRequested events
      const filter = contract.filters.RedeemRequested();
      const events = await contract.queryFilter(filter, fromBlock, toBlock);

      for (const event of events) {
        if ('args' in event && event.args) {
          const [requestId, from, amount] = event.args;
          
          const redeemEvent: RedeemRequestedEvent = {
            requestId,
            from,
            amount,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            chainId,
          };

          await this.redeemService.processRedeemRequest(redeemEvent);
        }
      }

      logger.info(`Processed ${events.length} historical events for chain ${chainId}`);
    } catch (error) {
      logger.error(`Error processing historical events for chain ${chainId}`, { error: error instanceof Error ? error.message : String(error) });
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
    for (const contract of Object.values(this.contracts)) {
      contract.removeAllListeners();
    }

    logger.info('EVM event listeners stopped');
  }

  /**
   * Health check for all chain connections
   */
  async healthCheck(): Promise<Record<number, boolean>> {
    const results: Record<number, boolean> = {};

    for (const [chainId, provider] of Object.entries(this.providers)) {
      try {
        await provider.getBlockNumber();
        results[parseInt(chainId, 10)] = true;
      } catch (error) {
        logger.error(`Health check failed for chain ${chainId}`, { error: error instanceof Error ? error.message : String(error) });
        results[parseInt(chainId, 10)] = false;
      }
    }

    return results;
  }
}
