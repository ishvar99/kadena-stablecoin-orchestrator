'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

// Define Kadena EVM chain
const kadenaEVM = {
  id: 5920,
  name: 'Kadena EVM Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Kadena',
    symbol: 'KDA',
  },
  rpcUrls: {
    default: {
      http: ['https://evm-testnet.chainweb.com/chainweb/0.0/evm-testnet/chain/20/evm/rpc'],
    },
    public: {
      http: ['https://evm-testnet.chainweb.com/chainweb/0.0/evm-testnet/chain/20/evm/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Kadena EVM Explorer',
      url: 'https://explorer.chainweb.com/testnet',
    },
  },
  testnet: true,
} as const;

const config = getDefaultConfig({
  appName: 'StableMint Core',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'your-project-id',
  chains: [kadenaEVM, mainnet, sepolia],
  transports: {
    [kadenaEVM.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
