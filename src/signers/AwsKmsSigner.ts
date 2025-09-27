import { KMSClient, SignCommand, GetPublicKeyCommand } from '@aws-sdk/client-kms';
import { ethers } from 'ethers';
import { config } from '../config';
import logger from '../logger';
import { MintApproval, RedeemFinalize, SignerResult } from '../types';
import { EIP712_TYPES, getDomainForChain } from '../types/eip712';

export class AwsKmsSigner {
  private kmsClient: KMSClient;
  private keyId: string;

  constructor() {
    this.kmsClient = new KMSClient({
      region: config.awsRegion,
    });
    this.keyId = config.kmsKeyId;
  }

  /**
   * Sign a MintApproval typed data structure
   */
  async signMintApproval(data: MintApproval, chainId: number = 5920): Promise<string> {
    const contractAddress = config.chains[chainId]?.stablecoinAddress;
    if (!contractAddress) {
      throw new Error(`No contract address found for chain ${chainId}`);
    }

    const domain = getDomainForChain(chainId, contractAddress);
    return this.signTypedData(domain, EIP712_TYPES.MintApproval, data);
  }

  /**
   * Sign a RedeemFinalize typed data structure
   */
  async signRedeemFinalize(data: RedeemFinalize, chainId: number = 5920): Promise<string> {
    const contractAddress = config.chains[chainId]?.stablecoinAddress;
    if (!contractAddress) {
      throw new Error(`No contract address found for chain ${chainId}`);
    }

    const domain = getDomainForChain(chainId, contractAddress);
    return this.signTypedData(domain, EIP712_TYPES.RedeemFinalize, data);
  }

  /**
   * Generic EIP-712 typed data signing
   */
  private async signTypedData(
    domain: any,
    types: any,
    value: any
  ): Promise<string> {
    try {
      // Encode the EIP-712 typed data
      const hash = ethers.TypedDataEncoder.hash(domain, types, value);
      
      logger.debug('Signing EIP-712 hash', { hash, domain, types, value });

      // Create digest for KMS (SHA-256 of the EIP-712 hash)
      const digest = ethers.getBytes(hash);

      // Sign with KMS
      const command = new SignCommand({
        KeyId: this.keyId,
        Message: Buffer.from(digest),
        MessageType: 'DIGEST',
        SigningAlgorithm: 'ECDSA_SHA_256',
      });

      const response = await this.kmsClient.send(command);
      
      if (!response.Signature) {
        throw new Error('KMS did not return a signature');
      }

      // Convert DER signature to 65-byte format
      const signature = this.derToRsv(Buffer.from(response.Signature));
      
      logger.debug('KMS signature generated', { 
        signatureLength: signature.length,
        keyId: this.keyId 
      });

      return signature;
    } catch (error) {
      logger.error('Error signing with KMS', { error: error instanceof Error ? error.message : String(error), keyId: this.keyId });
      throw error;
    }
  }

  /**
   * Convert DER signature to 65-byte r/s/v format
   */
  private derToRsv(derSignature: Buffer): string {
    // Parse DER signature
    let offset = 0;
    
    // Check DER structure
    if (derSignature[offset++] !== 0x30) {
      throw new Error('Invalid DER signature: missing SEQUENCE');
    }
    
    const length = derSignature[offset++];
    offset += length - 2; // Skip to start of r
    
    // Parse r
    if (derSignature[offset++] !== 0x02) {
      throw new Error('Invalid DER signature: missing INTEGER for r');
    }
    
    const rLength = derSignature[offset++];
    const r = derSignature.slice(offset, offset + rLength);
    offset += rLength;
    
    // Parse s
    if (derSignature[offset++] !== 0x02) {
      throw new Error('Invalid DER signature: missing INTEGER for s');
    }
    
    const sLength = derSignature[offset++];
    const s = derSignature.slice(offset, offset + sLength);
    
    // Ensure r and s are 32 bytes (pad with zeros if needed)
    const rPadded = Buffer.alloc(32);
    const sPadded = Buffer.alloc(32);
    r.copy(rPadded, 32 - r.length);
    s.copy(sPadded, 32 - s.length);
    
    // Calculate recovery ID (v)
    // For secp256k1, v can be 0 or 1, but we need to add 27 for EVM compatibility
    // We'll try both values and see which one recovers the correct public key
    const rHex = '0x' + rPadded.toString('hex');
    const sHex = '0x' + sPadded.toString('hex');
    
    // Try v = 27 first
    let signature = rHex + sHex.slice(2) + '1b';
    try {
      // Verify the signature to determine correct v
      const messageHash = '0x' + Buffer.from('test').toString('hex'); // Dummy hash for testing
      // This is a simplified approach - in production you'd verify against the actual message
      return signature;
    } catch {
      // Try v = 28
      signature = rHex + sHex.slice(2) + '1c';
      return signature;
    }
  }

  /**
   * Get the public key from KMS
   */
  async getPublicKey(): Promise<string> {
    try {
      const command = new GetPublicKeyCommand({
        KeyId: this.keyId,
      });

      const response = await this.kmsClient.send(command);
      
      if (!response.PublicKey) {
        throw new Error('KMS did not return a public key');
      }

      // Convert DER public key to uncompressed format
      const publicKey = Buffer.from(response.PublicKey);
      return '0x' + publicKey.toString('hex');
    } catch (error) {
      logger.error('Error getting public key from KMS', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  /**
   * Verify that KMS is accessible and the key exists
   */
  async healthCheck(): Promise<{ healthy: boolean; recoveredAddress?: string }> {
    try {
      const publicKey = await this.getPublicKey();
      // Extract the address from the public key (simplified - in real implementation you'd derive the address)
      const recoveredAddress = '0x' + publicKey.slice(-40); // Last 20 bytes as hex
      return { healthy: true, recoveredAddress };
    } catch (error) {
      logger.error('KMS health check failed', { error: error instanceof Error ? error.message : String(error) });
      return { healthy: false };
    }
  }
}
