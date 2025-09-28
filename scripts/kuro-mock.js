const express = require('express');
const WebSocket = require('ws');
const crypto = require('crypto');
const { ethers } = require('ethers');

const app = express();
app.use(express.json());

// Configuration
const KADENA_EVM_RPC = process.env.KADENA_EVM_CHAIN_RPC || 'https://evm-testnet.chainweb.com/chainweb/0.0/evm-testnet/chain/20/evm/rpc';
const KYC_REGISTRY_ADDRESS = process.env.KYC_REGISTRY_CONTRACT_ADDRESS || '0x2814b08ddDaF12e6042a54BCB5f33cb962EdE28F';
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

// Initialize provider and wallet
const provider = new ethers.JsonRpcProvider(KADENA_EVM_RPC);
const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

// KYC Registry ABI (simplified)
const KYC_REGISTRY_ABI = [
  "event KYCApproved(address indexed user, uint256 timestamp, string name, string symbol)",
  "function setKYC(address user) external",
  "function isKYC(address user) view returns (bool)"
];

// Contract instance
const kycRegistry = new ethers.Contract(KYC_REGISTRY_ADDRESS, KYC_REGISTRY_ABI, provider);

// REST API
app.get('/api/mint-requests/pending', (req, res) => {
  res.json([]);
});

app.post('/api/mint-requests', (req, res) => {
  const requestId = crypto.randomUUID();
  res.json({ requestId, status: 'created' });
});

// Start REST server
const restServer = app.listen(8080, () => {
  console.log('Kuro mock REST server running on port 8080');
});

// WebSocket server for orchestrator connections
const wss = new WebSocket.Server({ server: restServer });

wss.on('connection', (ws) => {
  console.log('New orchestrator WebSocket connection');
  
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to Kuro mock service'
  }));

  ws.on('close', () => {
    console.log('Orchestrator WebSocket connection closed');
  });

  ws.on('error', (error) => {
    console.error('Orchestrator WebSocket error:', error);
  });
});

// Listen to Kadena EVM chain events
async function startChainListener() {
  console.log('Starting Kadena EVM chain event listener...');
  
  try {
    // Listen for KYCApproved events
    kycRegistry.on('KYCApproved', async (user, timestamp, name, symbol, event) => {
      console.log('KYCApproved event detected:', {
        user,
        timestamp: timestamp.toString(),
        name,
        symbol,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash
      });

      // Forward to orchestrator via WebSocket
      const kycEvent = {
        userAddress: user,
        timestamp: Number(timestamp),
        tokenName: name,
        tokenSymbol: symbol,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        chainId: 5920
      };

      // Broadcast to all connected orchestrators
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(kycEvent));
          console.log('Forwarded KYCApproved event to orchestrator');
        }
      });
    });

    console.log('KYCApproved event listener started');
  } catch (error) {
    console.error('Failed to start chain listener:', error);
  }
}

// No simulation - only listen to real chain events

console.log('Kuro mock WebSocket server running on port 8080');
console.log('Connected to Kadena EVM chain:', KADENA_EVM_RPC);
console.log('KYC Registry address:', KYC_REGISTRY_ADDRESS);
console.log('Relayer address:', wallet.address);
console.log('Mode: Listening to real chain events only (no simulation)');

// Start services
startChainListener();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down Kuro mock service...');
  restServer.close();
  wss.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down Kuro mock service...');
  restServer.close();
  wss.close();
  process.exit(0);
});
