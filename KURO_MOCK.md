# Kuro Mock Service

The Kuro Mock Service is a testing service that simulates the Kuro compliance service by listening to Kadena EVM chain events and forwarding them to the Orchestrator Service.

## Overview

The Kuro Mock Service:
1. **Listens to Kadena EVM Chain**: Monitors `KYCApproved` events from the KYC Registry contract
2. **Forwards Events**: Sends events to connected Orchestrator services via WebSocket
3. **Real Event Processing**: Only processes actual chain events (no simulation)
4. **Provides REST API**: Maintains compatibility with existing Kuro REST endpoints

## Architecture

```
Kadena EVM Chain (5920)
        ↓ (KYCApproved events)
Kuro Mock Service
        ↓ (WebSocket forwarding)
Orchestrator Service
        ↓ (deploy stablecoin)
Kadena EVM Chain (5920)
```

## Features

### Chain Event Listening
- Connects to Kadena EVM testnet RPC
- Listens for `KYCApproved` events from KYC Registry contract
- Forwards events to all connected Orchestrator services

### Real Event Processing
- Listens only to real `KYCApproved` events from the chain
- No simulation or fake data generation
- Pure event forwarding service

### WebSocket Server
- Accepts connections from Orchestrator services
- Broadcasts events to all connected clients
- Handles connection lifecycle management

### REST API
- `/api/mint-requests/pending` - Returns empty array
- `/api/mint-requests` - Creates mock mint requests

## Configuration

Environment variables:

```env
KADENA_EVM_CHAIN_RPC=https://evm-testnet.chainweb.com/chainweb/0.0/evm-testnet/chain/20/evm/rpc
KYC_REGISTRY_CONTRACT_ADDRESS=0x2814b08ddDaF12e6042a54BCB5f33cb962EdE28F
RELAYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## Event Format

The service forwards `KYCApproved` events in this format:

```json
{
  "userAddress": "0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8",
  "timestamp": 1234567890,
  "tokenName": "TestToken",
  "tokenSymbol": "TT",
  "blockNumber": 12345,
  "transactionHash": "0xabc123...",
  "chainId": 5920
}
```

## Usage

### Running with Docker Compose

```bash
docker-compose up kuro-mock
```

### Running Locally

```bash
cd scripts
npm install
node kuro-mock.js
```

### Testing

Use the test script to verify the service:

```bash
node test-kuro-mock.js
```

## Dependencies

- **ethers**: For blockchain interaction
- **express**: For REST API
- **ws**: For WebSocket server

## Logs

The service logs:
- Connection events
- KYCApproved events detected
- Transaction confirmations
- WebSocket connections
- Error messages

Example log output:
```
Kuro mock WebSocket server running on port 8080
Connected to Kadena EVM chain: https://evm-testnet.chainweb.com/...
KYC Registry address: 0x2814b08ddDaF12e6042a54BCB5f33cb962EdE28F
Relayer address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Starting Kadena EVM chain event listener...
KYCApproved event listener started
Starting KYC approval simulation...
Simulating KYC approval for 0x1234... with token TestToken (TT)
KYC approval transaction sent: 0xabc123...
KYC approval confirmed in block: 12345
```

## Integration with Orchestrator

The Orchestrator Service connects to the Kuro Mock Service via WebSocket:

```typescript
const ws = new WebSocket('ws://kuro-mock:8080/events');
```

Events are automatically forwarded and trigger stablecoin deployments.

## Security Notes

- Uses test private keys (not for production)
- Connects to testnet (not mainnet)
- Simulates random users for testing only
- No real KYC verification performed
