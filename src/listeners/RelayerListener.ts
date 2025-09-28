import { ethers } from 'ethers';
import { config } from '../config';
import logger from '../logger';
import { contractManager } from '../contracts';
import { StablecoinDeploymentService } from '../services/StablecoinDeploymentService';
import { KYCApprovedEvent, StablecoinMintEvent } from '../types';
import StablecoinDeployment from '../contracts/StablecoinDeployment.json';

export class RelayerListener {
  private provider: ethers.JsonRpcProvider;
  private kycRegistry: ethers.Contract;
  private isListening = false;
  private deploymentService: StablecoinDeploymentService;
  private deployedContracts: Map<string, ethers.Contract> = new Map();

  constructor() {
    this.provider = contractManager.getProvider();
    this.kycRegistry = contractManager.getContract('kycRegistry');
    this.deploymentService = new StablecoinDeploymentService();
  }

  /**
   * Start listening to relayer events
   */
  async start(): Promise<void> {
    if (this.isListening) {
      logger.warn('Relayer listener is already running');
      return;
    }

    logger.info('Starting relayer event listener');
    this.isListening = true;

    await this.startKYCListener();
    await this.loadExistingContracts();
  }

  /**
   * Start listening to KYCApproved events
   */
  private async startKYCListener(): Promise<void> {
    try {
      logger.info('Starting KYCApproved event listener');

      // Listen for KYCApproved events
      this.kycRegistry.on('KYCApproved', async (
        userAddress: string,
        timestamp: bigint,
        tokenName: string, 
        tokenSymbol: string, 
        event: ethers.Log
      ) => {
        try {
          const kycEvent: KYCApprovedEvent = {
            tokenName,
            tokenSymbol,
            userAddress,
            timestamp: Number(timestamp),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            chainId: config.chainId,
          };

          logger.info('KYCApproved event received from chain', {
            tokenName,
            tokenSymbol,
            userAddress,
            timestamp: Number(timestamp),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          });

          // Deploy stablecoin contract
          await this.deploymentService.deployStablecoin(kycEvent);

        } catch (error) {
          logger.error('Error processing KYCApproved event', {
            error: error instanceof Error ? error.message : String(error),
            tokenName,
            tokenSymbol,
            userAddress
          });
        }
      });

      // Also listen for MintRequested events
      this.kycRegistry.on('MintRequested', async (
        beneficiary: string,
        amount: bigint,
        event: ethers.Log
      ) => {
        try {
          logger.info('MintRequested event received', {
            beneficiary,
            amount: amount.toString(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          });

          // Here you could add logic to handle mint requests
          // For example, trigger the existing mint service or queue a mint job
          // This depends on your business logic requirements

        } catch (error) {
          logger.error('Error processing MintRequested event', {
            error: error instanceof Error ? error.message : String(error),
            beneficiary,
            amount: amount.toString()
          });
        }
      });

      logger.info('KYCApproved and MintRequested event listeners started');

    } catch (error) {
      logger.error('Failed to start KYC event listeners', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Load existing deployed contracts and start listening to their events
   */
  private async loadExistingContracts(): Promise<void> {
    try {
      logger.info('Loading existing deployed contracts');

      // This would load from database in a real implementation
      // For now, we'll start with an empty set
      // In production, you would query the database for all active contracts
      // and set up listeners for each one

      logger.info('Existing contracts loaded');

    } catch (error) {
      logger.error('Failed to load existing contracts', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Add a new deployed contract to the listener
   */
  async addContractListener(contractAddress: string, tokenName: string, tokenSymbol: string): Promise<void> {
    try {
      if (this.deployedContracts.has(contractAddress)) {
        logger.warn('Contract listener already exists', { contractAddress });
        return;
      }

      const contract = new ethers.Contract(
        contractAddress,
        StablecoinDeployment.abi,
        this.provider
      );

      // Listen for MintWithApproval events
      contract.on('MintWithApproval', async (to: string, amount: bigint, nonce: bigint, requestId: string, event: ethers.Log) => {
        try {
          const mintEvent: StablecoinMintEvent = {
            contractAddress,
            to,
            amount,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            chainId: config.chainId,
          };

          logger.info('Stablecoin minted', {
            contractAddress,
            tokenName,
            tokenSymbol,
            to,
            amount: amount.toString(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          });

          // Here you could add additional processing logic
          // such as updating database records, sending notifications, etc.

        } catch (error) {
          logger.error('Error processing mint event', {
            error: error instanceof Error ? error.message : String(error),
            contractAddress,
            to,
            amount: amount.toString()
          });
        }
      });

      this.deployedContracts.set(contractAddress, contract);
      logger.info('Contract listener added', { contractAddress, tokenName, tokenSymbol });

    } catch (error) {
      logger.error('Failed to add contract listener', {
        error: error instanceof Error ? error.message : String(error),
        contractAddress
      });
    }
  }

  /**
   * Remove a contract listener
   */
  async removeContractListener(contractAddress: string): Promise<void> {
    try {
      const contract = this.deployedContracts.get(contractAddress);
      if (contract) {
        contract.removeAllListeners();
        this.deployedContracts.delete(contractAddress);
        logger.info('Contract listener removed', { contractAddress });
      }
    } catch (error) {
      logger.error('Failed to remove contract listener', {
        error: error instanceof Error ? error.message : String(error),
        contractAddress
      });
    }
  }

  /**
   * Stop listening to events
   */
  async stop(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    logger.info('Stopping relayer event listener');
    this.isListening = false;

    // Remove KYC registry listener
    this.kycRegistry.removeAllListeners();

    // Remove all contract listeners
    for (const [address, contract] of this.deployedContracts) {
      contract.removeAllListeners();
    }
    this.deployedContracts.clear();

    logger.info('Relayer event listener stopped');
  }


  /**
   * Health check for relayer listener
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber();
      return true;
    } catch (error) {
      logger.error('Relayer listener health check failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}
