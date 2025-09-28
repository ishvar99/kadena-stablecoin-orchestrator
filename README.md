# Stablecoin Orchestrator Service

A production-grade orchestrator service for launching stablecoins on Kadena EVM with compliance and security built-in. This service acts as a bridge between compliance systems (Kuro) and the blockchain, handling KYC approvals, contract deployment, and minting operations.

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Orchestrator   │    │   Kadena EVM    │
│   (Next.js)     │◄──►│   Service        │◄──►│   Chain 5920    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   MetaMask      │    │   Kuro Mock      │    │   KYC Registry  │
│   Wallet        │    │   Service        │    │   Contract      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │   PostgreSQL     │
                       │   Database       │
                       └──────────────────┘
```

## 🚀 Features

### Backend (Orchestrator Service)
- **Event Listening**: Monitors KYC approvals and mint requests
- **Contract Deployment**: Automatically deploys stablecoin contracts
- **HSM Integration**: AWS KMS for secure EIP-712 signing
- **Queue System**: BullMQ with Redis for reliable processing
- **Database**: PostgreSQL with Prisma ORM
- **Health Monitoring**: Comprehensive health checks and metrics
- **Graceful Shutdown**: Production-ready error handling

### Frontend (Stablecoin Launcher)
- **Wallet Integration**: MetaMask and other Web3 wallets
- **KYC Submission**: Institution details and document upload
- **Real-time Status**: Transaction tracking and confirmation
- **Responsive Design**: Mobile-friendly interface
- **Smart Contract Integration**: Direct blockchain interaction

## 📁 Project Structure

```
orchestrator-service/
├── src/                          # Backend source code
│   ├── contracts/                # Smart contract ABIs
│   ├── db/                       # Database service
│   ├── listeners/                # Event listeners
│   ├── services/                 # Business logic
│   ├── signers/                  # HSM integration
│   └── types/                    # TypeScript types
├── frontend/                     # Next.js frontend
│   ├── src/
│   │   ├── app/                  # Next.js app directory
│   │   └── hooks/                # React hooks
│   └── Dockerfile
├── tests/                        # Test files
├── scripts/                      # Utility scripts
├── docker-compose.yml            # Multi-service setup
└── README.md
```

## 🛠️ Setup & Installation

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use provided Prisma Accelerate)
- AWS KMS key (for production)

### Quick Start

1. **Clone the repository**
```bash
git clone <repository-url>
cd orchestrator-service
```

2. **Set up environment variables**
```bash
# Copy environment template
cp env.example .env

# Edit .env with your configuration
nano .env
```

3. **Start all services with Docker Compose**
```bash
docker-compose up -d
```

4. **Access the services**
- Frontend: http://localhost:3001
- Orchestrator API: http://localhost:3000
- Kuro Mock: http://localhost:8080

### Manual Setup

#### Backend Setup
```bash
# Install dependencies
npm install

# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Start development server
npm run dev
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Start development server
npm run dev
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/orchestrator_db"

# AWS KMS
AWS_REGION="us-east-1"
KMS_KEY_ID="arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"

# Chain Configuration
KADENA_EVM_CHAIN_RPC="https://evm-testnet.chainweb.com/chainweb/0.0/evm-testnet/chain/20/evm/rpc"

# Contract Addresses
STABLECOIN_CONTRACT_ADDRESS="0x..."
KYC_REGISTRY_CONTRACT_ADDRESS="0x..."

# Relayer Private Key
RELAYER_PRIVATE_KEY="0x..."

# Redis
REDIS_URL="redis://localhost:6379"

# Server
PORT=3000
NODE_ENV="development"
LOG_LEVEL="info"
```

#### Frontend (.env.local)
```env
# WalletConnect Project ID
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="your-project-id"

# Contract Addresses
NEXT_PUBLIC_KYC_REGISTRY_ADDRESS="0x..."

# RPC URL
NEXT_PUBLIC_KADENA_EVM_RPC="https://evm-testnet.chainweb.com/chainweb/0.0/evm-testnet/chain/20/evm/rpc"
```

## 🔄 Workflows

### 1. KYC Approval Flow
```
Institution submits KYC → Frontend calls setKYC() → KYCApproved event → 
Orchestrator deploys stablecoin contract → Contract ready for minting
```

### 2. Mint Request Flow
```
Kuro emits mintOk → Orchestrator requests HSM signature → 
mintWithApproval() transaction → Tokens minted to user
```

### 3. Redeem Request Flow
```
User calls requestRedeem() → Tokens burned immediately → 
RedeemRequested event → Orchestrator processes event
```

## 🧪 Testing

### Run Tests
```bash
# Backend tests
npm test

# Frontend tests
cd frontend && npm test

# Integration tests
npm run test:integration
```

### Test Coverage
```bash
npm run test:coverage
```

## 📊 Monitoring

### Health Endpoints
- **Liveness**: `GET /health/live`
- **Readiness**: `GET /health/ready`
- **Full Status**: `GET /health`

### Metrics
- Request processing times
- Database connection status
- KMS health status
- Chain connectivity
- Queue processing status

## 🚀 Deployment

### Docker Deployment
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale orchestrator=3
```

### Production Considerations
- Use environment-specific configuration
- Set up proper secrets management
- Configure load balancing
- Set up monitoring and alerting
- Use production-grade databases
- Configure backup strategies

## 🔒 Security

### HSM Integration
- AWS KMS for EIP-712 signing
- Secure key management
- No private keys in code

### Database Security
- Encrypted connections
- Access controls
- Audit logging

### Network Security
- CORS configuration
- Rate limiting
- Input validation

## 📚 API Documentation

### Endpoints

#### Health Check
```http
GET /health
```

#### Request Status
```http
GET /status/:requestId
```

#### WebSocket Events
```javascript
// Connect to orchestrator events
const ws = new WebSocket('ws://localhost:3000/events');
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
- Check the documentation
- Review existing issues
- Create a new issue with detailed information

## 🔗 Related Projects

- [Kadena EVM Documentation](https://docs.kadena.io/)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Next.js Documentation](https://nextjs.org/docs/)