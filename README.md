# Orchestrator Service

A production-grade TypeScript/Node.js service that orchestrates mint and redeem operations for a stablecoin launchpad on Kadena EVM chains (5920-5924). The service sits between Kuro (compliance service) and the EVM chains, handling EIP-712 typed data signing with AWS KMS.

## Architecture

```
┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐
│    Kuro     │───▶│  Orchestrator   │───▶│ Kadena EVM Chains│
│ (Compliance)│    │    Service      │    │    (5920-5924)   │
└─────────────┘    └─────────────────┘    └──────────────────┘
                           │
                           ▼
                   ┌─────────────────┐
                   │   AWS KMS       │
                   │ (EIP-712 Signing)│
                   └─────────────────┘
```

## Features

- **Event-Driven Architecture**: Listens to Kuro WebSocket events and EVM contract events
- **AWS KMS Integration**: Secure EIP-712 typed data signing with AWS KMS
- **Multi-Chain Support**: Supports Kadena EVM chains 5920-5924
- **Queue-Based Processing**: Uses BullMQ with Redis for reliable job processing
- **Database Persistence**: PostgreSQL with Prisma ORM for request tracking
- **Health Monitoring**: Comprehensive health checks and metrics
- **Production Ready**: Docker containerization, graceful shutdown, error handling

## Quick Start

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- AWS KMS key with ECC_SECG_P256K1 algorithm
- PostgreSQL database
- Redis instance

### 1. Clone and Setup

```bash
git clone <repository-url>
cd orchestrator-service
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure:

```bash
cp env.example .env
```

Update the following required variables:

```env
# AWS KMS Configuration
AWS_REGION=us-east-1
KMS_KEY_ID=arn:aws:kms:us-east-1:123456789012:key/your-key-id

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/orchestrator_db

# Chain RPC URLs (update with actual endpoints)
KADENA_EVM_CHAIN_5920_RPC=https://api-evm-5920.kadena.network
# ... other chains

# Contract Addresses (update with deployed addresses)
STABLECOIN_CONTRACT_ADDRESS_5920=0x1234567890123456789012345678901234567890
# ... other chains

# Relayer Private Keys (for gas payments)
RELAYER_PRIVATE_KEY_5920=0x1234567890123456789012345678901234567890123456789012345678901234
# ... other chains
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push
```

### 4. Development

```bash
# Start development environment
docker-compose -f docker-compose.dev.yml up -d postgres redis

# Start the service
npm run dev
```

### 5. Production Deployment

```bash
# Build and start all services
docker-compose up -d

# Check logs
docker-compose logs -f orchestrator
```

## API Endpoints

### Health Endpoints

- `GET /health` - Comprehensive health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Status Endpoints

- `GET /status/:requestId` - Get request status
- `GET /status` - List recent requests (with query parameters)

### Metrics Endpoints

- `GET /metrics` - Basic service metrics
- `GET /metrics/queues` - Queue statistics

## Core Components

### AWS KMS Signer (`src/signers/AwsKmsSigner.ts`)

Handles EIP-712 typed data signing with AWS KMS:

```typescript
const signer = new AwsKmsSigner();

// Sign mint approval
const signature = await signer.signMintApproval({
  requestId: 'req-123',
  to: '0x742d35Cc6634C0532925a3b8D8C9c9B6C6c8C8C8',
  amount: BigInt('1000000000000000000'),
  nonce: BigInt('1'),
  deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
}, 5920);
```

### Event Listeners

- **KuroListener**: Listens to Kuro WebSocket events for mint requests
- **EVMListener**: Listens to EVM contract events for redeem requests

### Orchestration Services

- **MintService**: Processes mint requests from Kuro
- **RedeemService**: Processes redeem requests from EVM
- **QueueService**: Manages job queues with BullMQ

## Data Flow

### Mint Flow

1. Kuro emits `mintOk` event via WebSocket
2. Orchestrator receives event and creates database record
3. Request is queued for processing
4. AWS KMS signs EIP-712 `MintApproval` typed data
5. Relayer submits `mintWithApproval()` transaction
6. Database record updated with transaction hash

### Redeem Flow

1. User calls `requestRedeem()` on EVM contract
2. Orchestrator detects `RedeemRequested` event
3. Request is queued for processing
4. AWS KMS signs EIP-712 `RedeemFinalize` typed data
5. Relayer submits `finalizeRedeem()` transaction
6. Database record updated with transaction hash

## Testing

```bash
# Run unit tests
npm test

# Run tests with coverage
npm run test -- --coverage

# Run integration tests
npm run test -- tests/integration.test.ts
```

## Monitoring

The service provides comprehensive monitoring through:

- **Health Checks**: `/health` endpoint for Kubernetes/container orchestration
- **Metrics**: `/metrics` endpoint for Prometheus scraping
- **Logging**: Structured JSON logs with Pino
- **Database Tracking**: All requests stored with status tracking

## Security Considerations

- **AWS KMS**: Private keys never leave AWS KMS
- **Relayer Keys**: Hot wallets only used for gas payments
- **Rate Limiting**: Express rate limiting on all endpoints
- **Input Validation**: Joi validation for all inputs
- **Error Handling**: Secure error messages without sensitive data

## Production Deployment

### Docker

```bash
# Build production image
docker build -t orchestrator-service .

# Run with docker-compose
docker-compose up -d
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orchestrator-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: orchestrator-service
  template:
    metadata:
      labels:
        app: orchestrator-service
    spec:
      containers:
      - name: orchestrator
        image: orchestrator-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: orchestrator-secrets
              key: database-url
        - name: KMS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: orchestrator-secrets
              key: kms-key-id
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Configuration

All configuration is done through environment variables. See `env.example` for the complete list of required and optional variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run the test suite
6. Submit a pull request

## License

MIT License - see LICENSE file for details.
