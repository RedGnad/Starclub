// Simplified SIWE (Sign-In With Ethereum) implementation

export interface SiweMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
}

/**
 * Build a SIWE message for signing
 */
export function buildSiweMessage(params: {
  address: string;
  chainId: number;
  nonce: string;
}): string {
  const domain = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  
  const message = `${domain} wants you to sign in with your Ethereum account:
${params.address}

Welcome to Sherlock dApp Discovery! Please sign this message to verify your identity.

URI: ${origin}
Version: 1
Chain ID: ${params.chainId}
Nonce: ${params.nonce}
Issued At: ${new Date().toISOString()}`;

  return message;
}

/**
 * Get browser context for SIWE
 */
export function getBrowserContext() {
  if (typeof window === 'undefined') {
    return {
      domain: 'localhost:3000',
      origin: 'http://localhost:3000'
    };
  }

  return {
    domain: window.location.host,
    origin: window.location.origin
  };
}
