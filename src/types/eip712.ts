import { TypedDataDomain } from 'ethers';

export const EIP712_DOMAIN: TypedDataDomain = {
  name: "Stablecoin",
  version: "1",
  chainId: 5920,
  verifyingContract: "0x1234567890123456789012345678901234567890", // Will be updated per chain
};

export const EIP712_TYPES = {
  MintApproval: [
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint64" },
    { name: "chainId", type: "uint256" },
    { name: "requestId", type: "bytes32" },
  ],
  RedeemFinalize: [
    { name: "from", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "expiry", type: "uint64" },
    { name: "chainId", type: "uint256" },
    { name: "requestId", type: "bytes32" },
  ],
};

export const getDomainForChain = (chainId: number, contractAddress: string): TypedDataDomain => ({
  name: EIP712_DOMAIN.name,
  version: EIP712_DOMAIN.version,
  chainId,
  verifyingContract: contractAddress,
});
