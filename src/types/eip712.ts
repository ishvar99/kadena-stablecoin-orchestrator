import { TypedDataDomain } from 'ethers';

export const EIP712_DOMAIN: TypedDataDomain = {
  name: "Stablecoin",
  version: "1",
  chainId: 5920,
  verifyingContract: "0x1234567890123456789012345678901234567890", // Will be updated per chain
};

export const EIP712_TYPES = {
  MintApproval: [
    { name: "requestId", type: "string" },
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
  RedeemFinalize: [
    { name: "requestId", type: "string" },
    { name: "from", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

export const getDomainForChain = (chainId: number, contractAddress: string): TypedDataDomain => ({
  name: EIP712_DOMAIN.name,
  version: EIP712_DOMAIN.version,
  chainId,
  verifyingContract: contractAddress,
});
