import { ethers } from 'ethers';
import { config } from '../config';
import StablecoinABI from './Stablecoin.json';
import KYCRegistryABI from './KYCRegistry.json';
import { StablecoinContract, KYCRegistryContract } from './interfaces';

export interface ContractInstances {
  stablecoin: StablecoinContract;
  kycRegistry: KYCRegistryContract;
}

export class ContractManager {
  private providers: Record<number, ethers.JsonRpcProvider> = {};
  private contracts: Record<number, ContractInstances> = {};

  constructor() {
    this.initializeProviders();
    this.initializeContracts();
  }

  private initializeProviders() {
    for (const [chainId, chainConfig] of Object.entries(config.chains)) {
      const chainIdNum = parseInt(chainId, 10);
      this.providers[chainIdNum] = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
    }
  }

  private initializeContracts() {
    for (const [chainId, chainConfig] of Object.entries(config.chains)) {
      const chainIdNum = parseInt(chainId, 10);
      const provider = this.providers[chainIdNum];

      this.contracts[chainIdNum] = {
        stablecoin: new ethers.Contract(
          chainConfig.stablecoinAddress,
          StablecoinABI,
          provider
        ),
        kycRegistry: new ethers.Contract(
          config.chains[5920].stablecoinAddress, // KYC registry only on main chain
          KYCRegistryABI,
          provider
        ),
      };
    }
  }

  getContract(chainId: number, contractName: keyof ContractInstances): ethers.Contract {
    const contract = this.contracts[chainId]?.[contractName];
    if (!contract) {
      throw new Error(`Contract ${contractName} not found for chain ${chainId}`);
    }
    return contract;
  }

  getProvider(chainId: number): ethers.JsonRpcProvider {
    const provider = this.providers[chainId];
    if (!provider) {
      throw new Error(`Provider not found for chain ${chainId}`);
    }
    return provider;
  }

  getWallet(chainId: number): ethers.Wallet {
    const provider = this.getProvider(chainId);
    const privateKey = config.chains[chainId].relayerPrivateKey;
    return new ethers.Wallet(privateKey, provider);
  }

  async isKYCVerified(userAddress: string, chainId: number = 5920): Promise<boolean> {
    try {
      const kycRegistry = this.getContract(chainId, 'kycRegistry') as any;
      return await kycRegistry.isKYCVerified(userAddress);
    } catch (error) {
      console.error('Error checking KYC status:', error);
      return false;
    }
  }

  /**
   * Health check for all contract connections
   */
  async healthCheck(): Promise<Record<number, boolean>> {
    const results: Record<number, boolean> = {};
    
    for (const chainId of Object.keys(config.chains).map(Number)) {
      try {
        const provider = this.getProvider(chainId);
        await provider.getBlockNumber();
        results[chainId] = true;
      } catch (error) {
        console.error(`Health check failed for chain ${chainId}:`, error);
        results[chainId] = false;
      }
    }
    
    return results;
  }
}

export const contractManager = new ContractManager();
