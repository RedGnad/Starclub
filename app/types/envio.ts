/**
 * Types pour l'API Envio HyperSync
 */

export interface EnvioConfig {
  hyperSyncUrl: string;
  chainId: string;
}

export interface EnvioTransaction {
  hash: string;
  from: string;
  to: string | null;
  blockNumber: number;
  timestamp: number;
  input: string;
  value: string;
  gasUsed?: string;
  gasPrice?: string;
  status?: number;
  contractAddress?: string | null;
  contract_address?: string | null; // Snake_case version from Envio API
}

export interface EnvioBlock {
  number: number;
  hash: string;
  timestamp: number;
  transactions: EnvioTransaction[];
}

export interface EnvioLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

export interface HyperSyncQuery {
  from_block: number;
  to_block?: number;
  logs?: Array<{
    address?: string[];
    topics?: string[][];
  }>;
  transactions?: Array<{
    from?: string[];
    to?: string[];
  }>;
  field_selection?: {
    block?: string[];
    transaction?: string[];
    log?: string[];
  };
}

export interface HyperSyncResponse {
  archiveHeight: number;
  nextBlock: number;
  totalExecutionTime: number;
  blocks: EnvioBlock[];
  transactions: EnvioTransaction[];
  logs: EnvioLog[];
}
