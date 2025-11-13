import { createConfig } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import { WalletConnectConnector } from "wagmi/connectors/walletConnect";
import { publicProvider } from "wagmi/providers/public";
import { configureChains } from "wagmi";

// Monad Testnet configuration
export const monadTestnet = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://monad-testnet.g.alchemy.com/v2/GmzSvBUT_o45yt7CzuavK"],
    },
    public: {
      http: ["https://monad-testnet.g.alchemy.com/v2/GmzSvBUT_o45yt7CzuavK"],
    },
  },
  blockExplorers: {
    default: { name: "Monad Scan", url: "https://testnet.monadscan.io" },
  },
  testnet: true,
} as const;

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [monadTestnet as any],
  [publicProvider()]
);

const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID;

const connectors = [
  // MetaMask spécifique
  new InjectedConnector({
    chains,
    options: {
      name: "MetaMask",
      shimDisconnect: true,
      getProvider: () => {
        if (typeof window !== 'undefined' && (window as any).ethereum?.isMetaMask) {
          return (window as any).ethereum;
        }
      },
    },
  }),
  // Rabby spécifique
  new InjectedConnector({
    chains,
    options: {
      name: "Rabby",
      shimDisconnect: true,
      getProvider: () => {
        if (typeof window !== 'undefined' && (window as any).ethereum?.isRabby) {
          return (window as any).ethereum;
        }
      },
    },
  }),
  // Phantom (EVM mode) spécifique
  new InjectedConnector({
    chains,
    options: {
      name: "Phantom",
      shimDisconnect: true,
      getProvider: () => {
        if (typeof window !== 'undefined' && (window as any).phantom?.ethereum) {
          return (window as any).phantom.ethereum;
        }
      },
    },
  }),
  // Backpack spécifique
  new InjectedConnector({
    chains,
    options: {
      name: "Backpack",
      shimDisconnect: true,
      getProvider: () => {
        if (typeof window !== 'undefined' && (window as any).backpack?.ethereum) {
          return (window as any).backpack.ethereum;
        }
      },
    },
  }),
  // Generic injected pour autres wallets
  new InjectedConnector({
    chains,
    options: {
      name: "Other Wallet",
      shimDisconnect: true,
    },
  }),
];

// Only add WalletConnect if projectId is provided
if (projectId) {
  connectors.push(
    new WalletConnectConnector({
      chains,
      options: {
        projectId,
      },
    }) as any
  );
}

export const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient,
  webSocketPublicClient,
});
