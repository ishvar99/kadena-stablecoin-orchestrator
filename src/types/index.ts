export interface MintApproval {
  to: string;
  amount: bigint;
  nonce: bigint;
  expiry: bigint;
  chainId: bigint;
  requestId: string;
}

export interface RedeemFinalize {
  from: string;
  amount: bigint;
  nonce: bigint;
  expiry: bigint;
  chainId: bigint;
  requestId: string;
}

export interface KuroMintEvent {
  requestId: string;
  user: string;
  amount: string;
  fiatRef: string;
  timestamp: number;
}

export interface RedeemRequestedEvent {
  requestId: string;
  from: string;
  amount: bigint;
  blockNumber: number;
  transactionHash: string;
  chainId: number;
}

export interface KYCApprovedEvent {
  tokenName: string;
  tokenSymbol: string;
  userAddress: string;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
  chainId: number;
}

export interface DeployedStablecoin {
  id: string;
  tokenName: string;
  tokenSymbol: string;
  contractAddress: string;
  deployerAddress: string;
  deploymentTxHash: string;
  blockNumber: number;
  chainId: number;
  createdAt: Date;
  isActive: boolean;
}

export interface StablecoinMintEvent {
  contractAddress: string;
  to: string;
  amount: bigint;
  blockNumber: number;
  transactionHash: string;
  chainId: number;
}

export interface RequestRecord {
  id: string;
  requestId: string;
  type: 'mint' | 'redeem';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  userAddress: string;
  amount: string;
  chainId: number;
  txHash?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  fiatRef?: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: number;
  services: {
    database: 'up' | 'down';
    kms: 'up' | 'down';
    redis: 'up' | 'down';
    chains: Record<number, 'up' | 'down'>;
  };
  extra?: {
    kmsRecoveredAddress?: string;
    relayerAddress?: string;
    relayerBalance?: string;
  };
  uptime: number;
}

export interface SignerResult {
  signature: string;
  recoveryId: number;
}

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  hash?: string; // For backward compatibility
  blockNumber?: number;
  gasUsed?: string;
  contractAddress?: string;
  error?: string;
  message?: string;
}
