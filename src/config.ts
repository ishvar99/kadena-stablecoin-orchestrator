import dotenv from 'dotenv';

dotenv.config();

export interface ChainConfig {
  chainId: number;
  rpcUrl: string;
  stablecoinAddress: string;
  relayerPrivateKey: string;
}

export interface Config {
  // Database
  databaseUrl: string;
  
  // AWS KMS
  awsRegion: string;
  kmsKeyId: string;
  
  // Chains
  chains: Record<number, ChainConfig>;
  
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

const getChainConfig = (chainId: number): ChainConfig => {
  const rpcUrl = process.env[`KADENA_EVM_CHAIN_${chainId}_RPC`];
  const stablecoinAddress = process.env[`STABLECOIN_CONTRACT_ADDRESS_${chainId}`];
  const relayerPrivateKey = process.env[`RELAYER_PRIVATE_KEY_${chainId}`];
  
  if (!rpcUrl || !stablecoinAddress || !relayerPrivateKey) {
    throw new Error(`Missing configuration for chain ${chainId}`);
  }
  
  return {
    chainId,
    rpcUrl,
    stablecoinAddress,
    relayerPrivateKey,
  };
};

export const config: Config = {
  databaseUrl: process.env.DATABASE_URL || 'prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza182UmpKQmNCSVdvRi1iZWNiZDVGbmwiLCJhcGlfa2V5IjoiMDFLNjRXUDI3OFNROTUxQTlHN1JHVDNQSjciLCJ0ZW5hbnRfaWQiOiIyYjcwYzNmZmNhODQ1ZDQ1NWJhZjBkYTdiM2ExMjczMGFmNDFjZDAxMWRiZmJkM2QwYjAyZWExZGRkZGJiZTdjIiwiaW50ZXJuYWxfc2VjcmV0IjoiMzNmMThjMjktZmJkMS00YTZhLWE0ZmYtYmJlN2ZmOGFkNTY3In0.URNVO5xVxOq3H7DdY6cGdGk9Ll6_m2wE_4dGSF8qsBc',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  kmsKeyId: process.env.KMS_KEY_ID || '',
  chains: {
    5920: getChainConfig(5920),
    5921: getChainConfig(5921),
    5922: getChainConfig(5922),
    5923: getChainConfig(5923),
    5924: getChainConfig(5924),
  },
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
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
