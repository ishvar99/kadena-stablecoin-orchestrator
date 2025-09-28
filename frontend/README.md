# Stablecoin Launcher Frontend

A Next.js application for institutions to launch stablecoins on Kadena EVM with KYC compliance.

## Features

- **Wallet Integration**: Connect with MetaMask and other Web3 wallets
- **KYC Submission**: Submit institution details and KYC documents
- **Smart Contract Integration**: Direct interaction with KYC Registry contract
- **Real-time Status**: Track transaction status and confirmation
- **Responsive Design**: Mobile-friendly interface

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env.local
```

3. Update environment variables in `.env.local`:
```env
# WalletConnect Project ID (get from https://cloud.walletconnect.com/)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your-walletconnect-project-id

# KYC Registry Contract Address
NEXT_PUBLIC_KYC_REGISTRY_ADDRESS=0x2814b08ddDaF12e6042a54BCB5f33cb962EdE28F

# Kadena EVM RPC URL
NEXT_PUBLIC_KADENA_EVM_RPC=https://evm-testnet.chainweb.com/chainweb/0.0/evm-testnet/chain/20/evm/rpc
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Connect Wallet**: Click "Connect MetaMask" to connect your wallet
2. **Fill Form**: Enter institution name, stablecoin name, and symbol
3. **Upload KYC**: Upload your KYC compliance document
4. **Submit**: Click "Submit KYC Application" to call the `setKYC` function
5. **Confirm**: Confirm the transaction in your wallet
6. **Track**: Monitor transaction status and view on explorer

## Smart Contract Integration

The application interacts with the KYC Registry contract's `setKYC` function:

```solidity
function setKYC(
    address user,
    string memory name,
    string memory symbol
) external;
```

## Technologies Used

- **Next.js 15**: React framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Wagmi**: Ethereum React hooks
- **RainbowKit**: Wallet connection UI
- **Viem**: Ethereum library
- **Lucide React**: Icons

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Main application page
│   └── providers.tsx       # Web3 providers configuration
├── hooks/
│   └── useKYCContract.ts   # Smart contract interaction hook
└── globals.css             # Global styles
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | WalletConnect project ID | Yes |
| `NEXT_PUBLIC_KYC_REGISTRY_ADDRESS` | KYC Registry contract address | Yes |
| `NEXT_PUBLIC_KADENA_EVM_RPC` | Kadena EVM RPC URL | Yes |

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Deployment

The application can be deployed to any platform that supports Next.js:

- **Vercel**: `vercel --prod`
- **Netlify**: Connect your GitHub repository
- **AWS Amplify**: Deploy from GitHub
- **Docker**: Use the included Dockerfile

## Support

For issues and questions, please refer to the main orchestrator service documentation.