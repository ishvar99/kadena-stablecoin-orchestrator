"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AwsKmsSigner_1 = require("../src/signers/AwsKmsSigner");
const ethers_1 = require("ethers");
// Mock the KMS client
const mockKmsClient = {
    send: jest.fn(),
};
jest.mock('@aws-sdk/client-kms', () => ({
    KMSClient: jest.fn().mockImplementation(() => mockKmsClient),
    SignCommand: jest.fn(),
    GetPublicKeyCommand: jest.fn(),
}));
describe('AwsKmsSigner', () => {
    let signer;
    let mockEthers;
    beforeEach(() => {
        signer = new AwsKmsSigner_1.AwsKmsSigner();
        mockEthers = ethers_1.ethers;
        // Reset mocks
        jest.clearAllMocks();
    });
    describe('signMintApproval', () => {
        it('should sign a mint approval successfully', async () => {
            const mintData = {
                requestId: 'test-request-123',
                to: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
                amount: BigInt('1000000000000000000'), // 1 ETH
                nonce: BigInt('1'),
                deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour from now
            };
            // Mock ethers functions
            mockEthers.TypedDataEncoder.hash.mockReturnValue('0x1234567890abcdef');
            mockEthers.getBytes.mockReturnValue(Buffer.from('1234567890abcdef', 'hex'));
            // Mock KMS response
            const mockSignature = Buffer.from([
                0x30, 0x44, // DER sequence
                0x02, 0x20, // r length
                ...Array(32).fill(0x01), // r value
                0x02, 0x20, // s length
                ...Array(32).fill(0x02), // s value
            ]);
            mockKmsClient.send.mockResolvedValue({
                Signature: mockSignature,
            });
            const result = await signer.signMintApproval(mintData, 5920);
            expect(result).toMatch(/^0x[a-fA-F0-9]{130}$/); // 65 bytes = 130 hex chars
            expect(mockKmsClient.send).toHaveBeenCalledWith(expect.any(Object));
        });
        it('should handle KMS errors gracefully', async () => {
            const mintData = {
                requestId: 'test-request-123',
                to: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
                amount: BigInt('1000000000000000000'),
                nonce: BigInt('1'),
                deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
            };
            mockEthers.TypedDataEncoder.hash.mockReturnValue('0x1234567890abcdef');
            mockEthers.getBytes.mockReturnValue(Buffer.from('1234567890abcdef', 'hex'));
            // Mock KMS error
            mockKmsClient.send.mockRejectedValue(new Error('KMS signing failed'));
            await expect(signer.signMintApproval(mintData, 5920)).rejects.toThrow('KMS signing failed');
        });
    });
    describe('signRedeemFinalize', () => {
        it('should sign a redeem finalize successfully', async () => {
            const redeemData = {
                requestId: 'test-redeem-123',
                from: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
                amount: BigInt('1000000000000000000'),
                nonce: BigInt('2'),
                deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
            };
            mockEthers.TypedDataEncoder.hash.mockReturnValue('0x1234567890abcdef');
            mockEthers.getBytes.mockReturnValue(Buffer.from('1234567890abcdef', 'hex'));
            const mockSignature = Buffer.from([
                0x30, 0x44,
                0x02, 0x20,
                ...Array(32).fill(0x01),
                0x02, 0x20,
                ...Array(32).fill(0x02),
            ]);
            mockKmsClient.send.mockResolvedValue({
                Signature: mockSignature,
            });
            const result = await signer.signRedeemFinalize(redeemData, 5920);
            expect(result).toMatch(/^0x[a-fA-F0-9]{130}$/);
            expect(mockKmsClient.send).toHaveBeenCalledWith(expect.any(Object));
        });
    });
    describe('getPublicKey', () => {
        it('should get public key from KMS', async () => {
            const mockPublicKey = Buffer.from([
                0x04, // Uncompressed public key prefix
                ...Array(64).fill(0x01), // 64 bytes for uncompressed key
            ]);
            mockKmsClient.send.mockResolvedValue({
                PublicKey: mockPublicKey,
            });
            const result = await signer.getPublicKey();
            expect(result).toMatch(/^0x[a-fA-F0-9]{130}$/); // 65 bytes = 130 hex chars
            expect(mockKmsClient.send).toHaveBeenCalledWith(expect.any(Object));
        });
        it('should handle KMS errors when getting public key', async () => {
            mockKmsClient.send.mockRejectedValue(new Error('KMS get public key failed'));
            await expect(signer.getPublicKey()).rejects.toThrow('KMS get public key failed');
        });
    });
    describe('healthCheck', () => {
        it('should return true when KMS is healthy', async () => {
            const mockPublicKey = Buffer.from([0x04, ...Array(64).fill(0x01)]);
            mockKmsClient.send.mockResolvedValue({ PublicKey: mockPublicKey });
            const result = await signer.healthCheck();
            expect(result).toBe(true);
        });
        it('should return false when KMS is unhealthy', async () => {
            mockKmsClient.send.mockRejectedValue(new Error('KMS unavailable'));
            const result = await signer.healthCheck();
            expect(result).toBe(false);
        });
    });
});
//# sourceMappingURL=AwsKmsSigner.test.js.map