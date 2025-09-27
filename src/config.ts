import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  // Database
  databaseUrl: string;
  
  // AWS KMS
  awsRegion: string;
  kmsKeyId: string;
  
  // Chain Configuration
  chainId: number;
  rpcUrl: string;
  stablecoinAddress: string;
  kycRegistryAddress: string;
  relayerPrivateKey: string;
  
  // Kuro Service
  kuroWebSocketUrl: string;
  kuroRestUrl: string;
  
  // Redis
  redisUrl: string;
  
  // Server
  port: number;
  nodeEnv: string;
  logLevel: string;
}

export const config: Config = {
  databaseUrl: process.env.DATABASE_URL || 'prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza182UmpKQmNCSVdvRi1iZWNiZDVGbmwiLCJhcGlfa2V5IjoiMDFLNjRXUDI3OFNROTUxQTlHN1JHVDNQSjciLCJ0ZW5hbnRfaWQiOiIyYjcwYzNmZmNhODQ1ZDQ1NWJhZjBkYTdiM2ExMjczMGFmNDFjZDAxMWRiZmJkM2QwYjAyZWExZGRkZGJiZTdjIiwiaW50ZXJuYWxfc2VjcmV0IjoiMzNmMThjMjktZmJkMS00YTZhLWE0ZmYtYmJlN2ZmOGFkNTY3In0.URNVO5xVxOq3H7DdY6cGdGk9Ll6_m2wE_4dGSF8qsBc',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  kmsKeyId: process.env.KMS_KEY_ID || '',
  chainId: 5920, // Default to Kadena EVM chain 20
  rpcUrl: process.env.KADENA_EVM_CHAIN_RPC || 'https://evm-testnet.chainweb.com/chainweb/0.0/evm-testnet/chain/20/evm/rpc',
  stablecoinAddress: process.env.STABLECOIN_CONTRACT_ADDRESS || '',
  kycRegistryAddress: process.env.KYC_REGISTRY_CONTRACT_ADDRESS || '',
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY || '',
  kuroWebSocketUrl: process.env.KURO_WEBSOCKET_URL || 'ws://localhost:8080/events',
  kuroRestUrl: process.env.KURO_REST_URL || 'http://localhost:8080/api',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate required environment variables
const requiredEnvVars = [
  'KMS_KEY_ID',
  'STABLECOIN_CONTRACT_ADDRESS',
  'KYC_REGISTRY_CONTRACT_ADDRESS',
  'RELAYER_PRIVATE_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
