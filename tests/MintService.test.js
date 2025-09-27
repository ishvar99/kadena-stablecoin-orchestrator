"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MintService_1 = require("../src/services/MintService");
const AwsKmsSigner_1 = require("../src/signers/AwsKmsSigner");
const db_1 = require("../src/db");
const contracts_1 = require("../src/contracts");
// Mock dependencies
jest.mock('../src/signers/AwsKmsSigner');
jest.mock('../src/db');
jest.mock('../src/contracts');
describe('MintService', () => {
    let mintService;
    let mockQueueService;
    let mockSigner;
    beforeEach(() => {
        mockQueueService = {
            addMintJob: jest.fn().mockResolvedValue(undefined),
        };
        mockSigner = {
            signMintApproval: jest.fn(),
            healthCheck: jest.fn().mockResolvedValue(true),
        };
        AwsKmsSigner_1.AwsKmsSigner.mockImplementation(() => mockSigner);
        mintService = new MintService_1.MintService(mockQueueService);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('processMintRequest', () => {
        it('should process a new mint request successfully', async () => {
            const request = {
                requestId: 'test-request-123',
                user: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
                amount: '1000000000000000000',
                fiatRef: 'REF123456',
            };
            // Mock database calls
            db_1.dbService.getRequest.mockResolvedValue(null);
            db_1.dbService.upsertRequest.mockResolvedValue({});
            await mintService.processMintRequest(request);
            expect(db_1.dbService.getRequest).toHaveBeenCalledWith('test-request-123');
            expect(db_1.dbService.upsertRequest).toHaveBeenCalledWith({
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
            const request = {
                requestId: 'test-request-123',
                user: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
                amount: '1000000000000000000',
                fiatRef: 'REF123456',
            };
            // Mock existing request
            db_1.dbService.getRequest.mockResolvedValue({
                requestId: 'test-request-123',
                status: 'PENDING',
            });
            await mintService.processMintRequest(request);
            expect(db_1.dbService.upsertRequest).not.toHaveBeenCalled();
            expect(mockQueueService.addMintJob).not.toHaveBeenCalled();
        });
        it('should handle database errors', async () => {
            const request = {
                requestId: 'test-request-123',
                user: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
                amount: '1000000000000000000',
                fiatRef: 'REF123456',
            };
            db_1.dbService.getRequest.mockRejectedValue(new Error('Database error'));
            db_1.dbService.updateRequestStatus.mockResolvedValue({});
            await expect(mintService.processMintRequest(request)).rejects.toThrow('Database error');
            expect(db_1.dbService.updateRequestStatus).toHaveBeenCalledWith('test-request-123', 'FAILED', undefined, 'Database error');
        });
    });
    describe('executeMint', () => {
        it('should execute mint transaction successfully', async () => {
            const request = {
                requestId: 'test-request-123',
                user: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
                amount: '1000000000000000000',
                fiatRef: 'REF123456',
            };
            // Mock database calls
            db_1.dbService.updateRequestStatus.mockResolvedValue({});
            db_1.dbService.getNextNonce.mockResolvedValue(BigInt(1));
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
            contracts_1.contractManager.getContract.mockReturnValue(mockContract);
            contracts_1.contractManager.getWallet.mockReturnValue(mockWallet);
            // Mock transaction
            const mockTx = {
                hash: '0xtx1234567890abcdef',
                wait: jest.fn().mockResolvedValue({
                    status: 1,
                    blockNumber: 12345,
                    gasUsed: BigInt(95000),
                }),
            };
            mockContract.mintWithApproval = jest.fn().mockResolvedValue(mockTx);
            const result = await mintService.executeMint(request);
            expect(result).toEqual({
                hash: '0xtx1234567890abcdef',
                blockNumber: 12345,
                gasUsed: '95000',
            });
            expect(mockSigner.signMintApproval).toHaveBeenCalled();
            expect(db_1.dbService.updateRequestStatus).toHaveBeenCalledWith('test-request-123', 'COMPLETED', '0xtx1234567890abcdef');
        });
        it('should handle transaction failure', async () => {
            const request = {
                requestId: 'test-request-123',
                user: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
                amount: '1000000000000000000',
                fiatRef: 'REF123456',
            };
            db_1.dbService.updateRequestStatus.mockResolvedValue({});
            db_1.dbService.getNextNonce.mockResolvedValue(BigInt(1));
            mockSigner.signMintApproval.mockResolvedValue('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12');
            const mockContract = {
                connect: jest.fn().mockReturnThis(),
                mintWithApproval: {
                    estimateGas: jest.fn().mockResolvedValue(BigInt(100000)),
                },
            };
            contracts_1.contractManager.getContract.mockReturnValue(mockContract);
            contracts_1.contractManager.getWallet.mockReturnValue({ address: '0xtest' });
            mockContract.mintWithApproval = jest.fn().mockRejectedValue(new Error('Transaction failed'));
            await expect(mintService.executeMint(request)).rejects.toThrow('Transaction failed');
            expect(db_1.dbService.updateRequestStatus).toHaveBeenCalledWith('test-request-123', 'FAILED', undefined, 'Transaction failed');
        });
    });
    describe('healthCheck', () => {
        it('should return true when signer is healthy', async () => {
            mockSigner.healthCheck.mockResolvedValue(true);
            const result = await mintService.healthCheck();
            expect(result).toBe(true);
        });
        it('should return false when signer is unhealthy', async () => {
            mockSigner.healthCheck.mockResolvedValue(false);
            const result = await mintService.healthCheck();
            expect(result).toBe(false);
        });
    });
});
//# sourceMappingURL=MintService.test.js.map