import { MintService } from '../src/services/MintService';
import { QueueService } from '../src/services/QueueService';
import { AwsKmsSigner } from '../src/signers/AwsKmsSigner';
import { dbService } from '../src/db';
import { contractManager } from '../src/contracts';
import { MintRequest } from '../src/services/MintService';

// Mock dependencies
jest.mock('../src/signers/AwsKmsSigner');
jest.mock('../src/db');
jest.mock('../src/contracts');

describe('MintService', () => {
  let mintService: MintService;
  let mockQueueService: jest.Mocked<QueueService>;
  let mockSigner: jest.Mocked<AwsKmsSigner>;

  beforeEach(() => {
    mockQueueService = {
      addMintJob: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockSigner = {
      signMintApproval: jest.fn(),
      healthCheck: jest.fn().mockResolvedValue(true),
    } as any;

    (AwsKmsSigner as jest.Mock).mockImplementation(() => mockSigner);

    mintService = new MintService(mockQueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processMintRequest', () => {
    it('should process a new mint request successfully', async () => {
      const request: MintRequest = {
        requestId: 'test-request-123',
        user: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
        amount: '1000000000000000000',
        fiatRef: 'REF123456',
      };

      // Mock database calls
      (dbService.getRequest as jest.Mock).mockResolvedValue(null);
      (dbService.upsertRequest as jest.Mock).mockResolvedValue({});

      await mintService.processMintRequest(request);

      expect(dbService.getRequest).toHaveBeenCalledWith('test-request-123');
      expect(dbService.upsertRequest).toHaveBeenCalledWith({
        requestId: 'test-request-123',
        type: 'MINT',
        status: 'PENDING',
        userAddress: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
        amount: '1000000000000000000',
        chainId: 5920,
        fiatRef: 'REF123456',
      });
      expect(mockQueueService.addMintJob).toHaveBeenCalledWith(request);
    });

    it('should handle duplicate requests (idempotency)', async () => {
      const request: MintRequest = {
        requestId: 'test-request-123',
        user: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
        amount: '1000000000000000000',
        fiatRef: 'REF123456',
      };

      // Mock existing request
      (dbService.getRequest as jest.Mock).mockResolvedValue({
        requestId: 'test-request-123',
        status: 'PENDING',
      });

      await mintService.processMintRequest(request);

      expect(dbService.upsertRequest).not.toHaveBeenCalled();
      expect(mockQueueService.addMintJob).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const request: MintRequest = {
        requestId: 'test-request-123',
        user: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
        amount: '1000000000000000000',
        fiatRef: 'REF123456',
      };

      (dbService.getRequest as jest.Mock).mockRejectedValue(new Error('Database error'));
      (dbService.updateRequestStatus as jest.Mock).mockResolvedValue({});

      await expect(mintService.processMintRequest(request)).rejects.toThrow('Database error');

      expect(dbService.updateRequestStatus).toHaveBeenCalledWith(
        'test-request-123',
        'FAILED',
        undefined,
        'Database error'
      );
    });
  });

  describe('executeMint', () => {
    it('should execute mint transaction successfully', async () => {
      const request: MintRequest = {
        requestId: 'test-request-123',
        user: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
        amount: '1000000000000000000',
        fiatRef: 'REF123456',
      };

      // Mock database calls
      (dbService.updateRequestStatus as jest.Mock).mockResolvedValue({});
      (dbService.getNextNonce as jest.Mock).mockResolvedValue(BigInt(1));

      // Mock signer
      mockSigner.signMintApproval.mockResolvedValue('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12');

      // Mock contract
      const mockContract = {
        connect: jest.fn().mockReturnThis(),
        mintWithApproval: {
          estimateGas: jest.fn().mockResolvedValue(BigInt(100000)),
        },
      };
      const mockWallet = {
        address: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
      };

      (contractManager.getContract as jest.Mock).mockReturnValue(mockContract);
      // Remove getWallet call as it's not used in the updated service

      // Mock transaction
      const mockTx = {
        hash: '0xtx1234567890abcdef',
        wait: jest.fn().mockResolvedValue({
          status: 1,
          blockNumber: 12345,
          gasUsed: BigInt(95000),
        }),
      };

      mockContract.mintWithApproval = {
        estimateGas: jest.fn().mockResolvedValue(BigInt(100000)),
        ...jest.fn().mockResolvedValue(mockTx)
      };

      const result = await mintService.executeMint(request);

      expect(result).toEqual({
        hash: '0xtx1234567890abcdef',
        blockNumber: 12345,
        gasUsed: '95000',
      });

      expect(mockSigner.signMintApproval).toHaveBeenCalled();
      expect(dbService.updateRequestStatus).toHaveBeenCalledWith('test-request-123', 'COMPLETED', '0xtx1234567890abcdef');
    });

    it('should handle transaction failure', async () => {
      const request: MintRequest = {
        requestId: 'test-request-123',
        user: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
        amount: '1000000000000000000',
        fiatRef: 'REF123456',
      };

      (dbService.updateRequestStatus as jest.Mock).mockResolvedValue({});
      (dbService.getNextNonce as jest.Mock).mockResolvedValue(BigInt(1));

      mockSigner.signMintApproval.mockResolvedValue('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12');

      const mockContract = {
        connect: jest.fn().mockReturnThis(),
        mintWithApproval: {
          estimateGas: jest.fn().mockResolvedValue(BigInt(100000)),
        },
      };

      (contractManager.getContract as jest.Mock).mockReturnValue(mockContract);
      // Remove getWallet call as it's not used in the updated service

      mockContract.mintWithApproval = {
        estimateGas: jest.fn().mockResolvedValue(BigInt(100000)),
        ...jest.fn().mockRejectedValue(new Error('Transaction failed'))
      };

      await expect(mintService.executeMint(request)).rejects.toThrow('Transaction failed');

      expect(dbService.updateRequestStatus).toHaveBeenCalledWith(
        'test-request-123',
        'FAILED',
        undefined,
        'Transaction failed'
      );
    });
  });

  describe('healthCheck', () => {
    it('should return true when signer is healthy', async () => {
      mockSigner.healthCheck.mockResolvedValue({ healthy: true });

      const result = await mintService.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when signer is unhealthy', async () => {
      mockSigner.healthCheck.mockResolvedValue({ healthy: false });

      const result = await mintService.healthCheck();

      expect(result).toBe(false);
    });
  });
});
