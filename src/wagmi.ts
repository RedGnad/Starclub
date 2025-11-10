import { createConfig, http } from "wagmi";
import { injected, walletConnect } from "wagmi/connectors";
import { defineChain } from "viem";

// Monad Testnet configuration
export const monadTestnet = defineChain({
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
});

const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID;

const connectors = [
  // Injected covers MetaMask, Rabby, Phantom EVM, Backpack, etc.
  injected(),
  // WalletConnect (QR / mobile). Only enabled if projectId provided.
  ...(projectId ? [walletConnect({ projectId })] : []),
];

const rpcUrl = process.env.REACT_APP_MONAD_RPC_URL || "https://monad-testnet.g.alchemy.com/v2/GmzSvBUT_o45yt7CzuavK";

export const config = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(rpcUrl),
  },
  connectors,
});
