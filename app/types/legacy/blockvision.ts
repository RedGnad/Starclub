/**
 * Types pour l'API BlockVision Monad Indexing
 */

export interface BlockVisionConfig {
  apiKey: string;
  baseUrl: string;
  chainId: string;
}

export interface Transaction {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  blockNumber: string;
  blockHash: string;
  timestamp: string;
  gas: string;
  gasPrice: string;
  gasUsed?: string;
  input: string;
  nonce: string;
  transactionIndex: string;
  status?: string;
  contractAddress?: string | null;
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: string;
  blockHash: string;
  from: string;
  to: string | null;
  contractAddress: string | null;
  status: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  logs: Log[];
}

export interface Log {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string;
  transactionHash: string;
  transactionIndex: string;
  blockHash: string;
  logIndex: string;
  removed: boolean;
}

export interface Block {
  number: string;
  hash: string;
  parentHash: string;
  timestamp: string;
  transactions: string[] | Transaction[];
  gasLimit: string;
  gasUsed: string;
  miner: string;
}

// Types pour l'API v2 de BlockVision

export interface AddressInfo {
  address: string;
  type: string;
  isContract: boolean;
  verified: boolean;
  ens: string | null;
  name: string | null;
  isContractCreated: boolean;
}

export interface AccountTransaction {
  hash: string;
  blockHash: string;
  blockNumber: string;
  timestamp: string;
  from: AddressInfo;
  to: AddressInfo | null;
  value: string;
  transactionFee: string;
  gasUsed: string;
  nonce: string;
  transactionIndex: string;
  contractAddress: string | null;
  status: number; // 1 = success, 0 = failed
  methodID: string;
  methodName: string;
}

export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  type: 'ERC20' | 'ERC721' | 'ERC1155';
  balance?: string;
  logo?: string;
}

export interface NativeHolder {
  holder: string;
  accountAddress: string;
  amount: string;
  percentage: string;
  usdValue: string;
  isContract: boolean;
}

export interface TokenHolder {
  address: string;
  amount: string;
  percentage: string;
}

export interface PaginatedResponse<T> {
  code: number;
  reason: string;
  message: string;
  result: {
    nextPageCursor?: string;
    total: number;
    data: T[];
  };
}
