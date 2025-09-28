import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// KYC Registry Contract ABI
const KYC_REGISTRY_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      }
    ],
    "name": "setKYC",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      }
    ],
    "name": "KYCApproved",
    "type": "event"
  }
] as const;

// Contract address - you'll need to update this with the actual deployed contract address
const KYC_REGISTRY_ADDRESS = process.env.NEXT_PUBLIC_KYC_REGISTRY_ADDRESS || '0x94015e24102d91878648Ce91AC4EEc153a8e87d6';

export function useKYCContract() {
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const submitKYC = async (userAddress: any, name: string, symbol: string) => {
    try {
      await writeContract({
        address: KYC_REGISTRY_ADDRESS as `0x${string}`,
        abi: KYC_REGISTRY_ABI,
        functionName: 'setKYC',
        args: [userAddress, name, symbol],
      });
    } catch (err) {
      console.error('Error submitting KYC:', err);
      throw err;
    }
  };

  return {
    submitKYC,
    hash,
    error,
    isPending,
    isConfirming,
    isConfirmed,
    isLoading: isPending || isConfirming,
  };
}
