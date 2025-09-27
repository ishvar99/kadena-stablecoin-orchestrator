export interface MintApproval {
  requestId: string;
  to: string;
  amount: bigint;
  nonce: bigint;
  deadline: bigint;
}

export interface RedeemFinalize {
  requestId: string;
  from: string;
  amount: bigint;
  nonce: bigint;
  deadline: bigint;
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
  uptime: number;
}

export interface SignerResult {
  signature: string;
  recoveryId: number;
}

export interface TransactionResult {
  hash: string;
  blockNumber?: number;
  gasUsed?: string;
}
