import { ethers } from 'ethers';
import { config } from '../config';
import logger from '../logger';
import { contractManager } from '../contracts';
import { dbService } from '../db';
import { KYCApprovedEvent, DeployedStablecoin, TransactionResult } from '../types';
import StablecoinDeployment from '../contracts/StablecoinDeployment.json';

export class StablecoinDeploymentService {
  private wallet: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = contractManager.getProvider();
    this.wallet = new ethers.Wallet(config.relayerPrivateKey, this.provider);
  }

  /**
   * Deploy a new Stablecoin contract
   */
  async deployStablecoin(event: KYCApprovedEvent): Promise<TransactionResult> {
    const { tokenName, tokenSymbol, userAddress, blockNumber, transactionHash } = event;
    
      // Check relayer balance before deployment
      const relayerBalance = await this.provider.getBalance(this.wallet.address);
      logger.info('Deploying new stablecoin contract', { 
        tokenName, 
        tokenSymbol, 
        userAddress,
        chainId: config.chainId,
        relayerAddress: this.wallet.address,
        relayerBalance: ethers.formatEther(relayerBalance)
      });

    try {
      // Check if contract already exists for this user/token combination
      const existingContract = await dbService.getDeployedStablecoinByUserAndToken(
        userAddress, 
        tokenName, 
        tokenSymbol
      );
      
      if (existingContract) {
        logger.warn('Stablecoin contract already exists for this user/token combination', {
          userAddress,
          tokenName,
          tokenSymbol,
          existingContractAddress: existingContract.contractAddress
        });
        return {
          success: true,
          txHash: existingContract.deploymentTxHash,
          message: 'Contract already deployed'
        };
      }

      // Get the Stablecoin contract factory
      const stablecoinFactory = new ethers.ContractFactory(
        StablecoinDeployment.abi,
        StablecoinDeployment.bytecode,
        this.wallet
      );

      // Deploy the contract with constructor parameters
      const deploymentTx = await stablecoinFactory.deploy(
        tokenName,
        tokenSymbol,
        config.kycRegistryAddress, // HSM signer address (using KYC registry for now)
        this.wallet.address // Initial relayer address
      );

      logger.info('Stablecoin deployment transaction sent', {
        txHash: deploymentTx.deploymentTransaction()?.hash,
        tokenName,
        tokenSymbol
      });

      // Wait for deployment to complete
      const deployedContract = await deploymentTx.waitForDeployment();
      const contractAddress = await deployedContract.getAddress();
      const deploymentTxHash = deploymentTx.deploymentTransaction()?.hash || '';

      logger.info('Stablecoin contract deployed successfully', {
        contractAddress,
        txHash: deploymentTxHash,
        tokenName,
        tokenSymbol
      });

      // Save deployment record to database
      const deployedStablecoin: DeployedStablecoin = {
        id: `${userAddress}-${tokenName}-${tokenSymbol}-${Date.now()}`,
        tokenName,
        tokenSymbol,
        contractAddress,
        deployerAddress: this.wallet.address,
        deploymentTxHash,
        blockNumber: await this.provider.getBlockNumber(),
        chainId: config.chainId,
        createdAt: new Date(),
        isActive: true
      };

      await dbService.saveDeployedStablecoin(deployedStablecoin);

      return {
        success: true,
        txHash: deploymentTxHash,
        contractAddress,
        message: 'Stablecoin deployed successfully'
      };

    } catch (error) {
      logger.error('Failed to deploy stablecoin contract', {
        error: error instanceof Error ? error.message : String(error),
        tokenName,
        tokenSymbol,
        userAddress
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Failed to deploy stablecoin contract'
      };
    }
  }


  /**
   * Health check for deployment service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if we can get the current block number
      await this.provider.getBlockNumber();
      return true;
    } catch (error) {
      logger.error('Stablecoin deployment service health check failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}
