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
  private provider!: ethers.JsonRpcProvider;
  private contracts!: ContractInstances;
  private wallet!: ethers.Wallet;

  constructor() {
    this.initializeProvider();
    this.initializeContracts();
    this.initializeWallet();
  }

  private initializeProvider() {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
  }

  private initializeContracts() {
    this.contracts = {
      stablecoin: new ethers.Contract(
        config.stablecoinAddress,
        StablecoinABI,
        this.provider
      ),
      kycRegistry: new ethers.Contract(
        config.kycRegistryAddress,
        KYCRegistryABI,
        this.provider
      ),
    };
  }

  private initializeWallet() {
    this.wallet = new ethers.Wallet(config.relayerPrivateKey, this.provider);
  }

  getContract(contractName: keyof ContractInstances): ethers.Contract {
    const contract = this.contracts[contractName];
    if (!contract) {
      throw new Error(`Contract ${contractName} not found`);
    }
    return contract;
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  getWallet(): ethers.Wallet {
    return this.wallet;
  }

  async isKYCVerified(userAddress: string): Promise<boolean> {
    try {
      const kycRegistry = this.getContract('kycRegistry') as any;
      return await kycRegistry.isKYCVerified(userAddress);
    } catch (error) {
      console.error('Error checking KYC status:', error);
      return false;
    }
  }

  /**
   * Health check for contract connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber();
      return true;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
}

export const contractManager = new ContractManager();
