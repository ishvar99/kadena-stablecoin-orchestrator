# Relayer Event Listener

The Relayer Event Listener is a component of the Orchestrator Service that automatically deploys Stablecoin contracts and monitors minting events based on KYC approval events.

## Overview

The relayer system consists of:

1. **RelayerListener** - Listens for KYCApproved events and manages contract deployments
2. **StablecoinDeploymentService** - Handles the actual deployment of Stablecoin contracts
3. **Database Integration** - Tracks deployed contracts and their status

## Features

### KYCApproved Event Listening
- Listens for `KYCApproved` events from the KYC Registry contract
- Event structure: `KYCApproved(address user, uint256 timestamp, string name, string symbol)`
- Automatically triggers stablecoin deployment when KYC is approved

### MintRequested Event Listening
- Listens for `MintRequested` events from the KYC Registry contract
- Event structure: `MintRequested(address beneficiary, uint256 amount)`
- Can be integrated with existing mint services for processing

### Automatic Contract Deployment
- Deploys new Stablecoin contracts with the following constructor parameters:
  - `_name`: Token name from the KYC event
  - `_symbol`: Token symbol from the KYC event  
  - `_owner`: User address from the KYC event
  - `_kycRegistry`: Address of the KYC Registry contract
  - `_relayer`: Address of the relayer wallet

### Mint Event Monitoring
- Monitors `Minted` events from all deployed stablecoin contracts
- Logs minting activities for tracking and auditing
- Supports multiple deployed contracts simultaneously

## Architecture

```
KYC Registry Contract
        ↓ (KYCApproved event)
RelayerListener
        ↓ (deployStablecoin)
StablecoinDeploymentService
        ↓ (deploy contract)
Database (save deployment record)
        ↓ (add contract listener)
RelayerListener (monitor mint events)
```

## Database Schema

The relayer uses the `DeployedStablecoin` table to track deployed contracts:

```sql
CREATE TABLE deployed_stablecoins (
  id TEXT PRIMARY KEY,
  token_name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  contract_address TEXT UNIQUE NOT NULL,
  deployer_address TEXT NOT NULL,
  deployment_tx_hash TEXT NOT NULL,
  block_number INTEGER NOT NULL,
  chain_id INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Configuration

The relayer uses the following configuration from `config.ts`:

- `chainId`: Kadena EVM chain ID (5920)
- `rpcUrl`: RPC endpoint for the chain
- `kycRegistryAddress`: Address of the KYC Registry contract
- `relayerPrivateKey`: Private key for the relayer wallet

## Usage

### Starting the Relayer

The relayer is automatically started when the Orchestrator Service starts:

```typescript
const relayerListener = new RelayerListener();
await relayerListener.start();
```

### Manual Contract Addition

You can manually add contract listeners for existing deployed contracts:

```typescript
await relayerListener.addContractListener(
  '0x1234...', // contract address
  'MyToken',   // token name
  'MTK'        // token symbol
);
```

### Health Monitoring

Check the relayer health:

```typescript
const isHealthy = await relayerListener.healthCheck();
```

## Events

### KYCApproved Event
```solidity
event KYCApproved(
  address indexed user,
  uint256 timestamp,
  string name,
  string symbol
);
```

### MintRequested Event
```solidity
event MintRequested(
  address indexed beneficiary,
  uint256 amount
);
```

### Minted Event (from deployed stablecoins)
```solidity
event Minted(
  address indexed to,
  uint256 amount
);
```

## Error Handling

- **Duplicate Deployments**: Checks for existing contracts before deployment
- **Deployment Failures**: Logs errors and returns failure status
- **Connection Issues**: Implements retry logic for RPC connections
- **Database Errors**: Graceful handling of database operation failures

## Testing

Run the relayer tests:

```bash
npm test -- RelayerListener.test.ts
```

## Monitoring

The relayer provides several monitoring endpoints:

- `/health` - Overall service health including relayer status
- `/metrics` - Queue and service metrics
- `/status/:requestId` - Individual request status

## Security Considerations

1. **Private Key Management**: Relayer private key should be stored securely
2. **Access Control**: Only authorized addresses should trigger KYC approvals
3. **Rate Limiting**: Implement rate limiting for deployment operations
4. **Gas Management**: Monitor gas usage for deployment transactions

## Future Enhancements

1. **Multi-Chain Support**: Deploy contracts on multiple chains
2. **Contract Upgrades**: Support for upgrading deployed contracts
3. **Batch Operations**: Deploy multiple contracts in a single transaction
4. **Event Filtering**: Filter events based on specific criteria
5. **Metrics Dashboard**: Real-time monitoring dashboard for deployed contracts
