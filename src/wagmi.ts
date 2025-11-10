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
  new InjectedConnector({
    chains,
    options: {
      name: "Injected",
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
