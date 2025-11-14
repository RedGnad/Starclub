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

// Créer les connectors avec des IDs uniques pour éviter les doublons
const createUniqueConnector = (id: string, name: string, getProvider: () => any) => {
  const connector = new InjectedConnector({
    chains,
    options: {
      name,
      shimDisconnect: true,
      getProvider,
    },
  });
  // Forcer un ID unique pour éviter les conflits
  (connector as any).id = id;
  return connector;
};

// Ne pas filtrer au moment de la création car window peut ne pas être prêt
// Le filtrage se fera au moment de la connexion
const finalConnectors = [
  // Toujours inclure MetaMask et les autres - ils se désactiveront automatiquement si pas disponibles
  createUniqueConnector(
    "metamask",
    "MetaMask",
    () => {
      if (typeof window !== 'undefined' && (window as any).ethereum?.isMetaMask) {
        return (window as any).ethereum;
      }
      return undefined;
    }
  ),
  
  createUniqueConnector(
    "rabby",
    "Rabby", 
    () => {
      if (typeof window !== 'undefined' && (window as any).ethereum?.isRabby) {
        return (window as any).ethereum;
      }
      return undefined;
    }
  ),
  
  createUniqueConnector(
    "phantom",
    "Phantom",
    () => {
      if (typeof window !== 'undefined' && (window as any).phantom?.ethereum) {
        return (window as any).phantom.ethereum;
      }
      return undefined;
    }
  ),
  
  createUniqueConnector(
    "backpack", 
    "Backpack",
    () => {
      if (typeof window !== 'undefined' && (window as any).backpack?.ethereum) {
        return (window as any).backpack.ethereum;
      }
      return undefined;
    }
  ),
  
  // Haha Wallet - Toujours inclure, la détection se fera au moment de la connexion
  createUniqueConnector(
    "haha",
    "Haha",
    () => {
      if (typeof window !== 'undefined') {
        const ethereum = (window as any).ethereum;
        const haha = (window as any).haha;
        
        // Essayer différentes méthodes de détection
        if (ethereum?.isHaha) {
          return ethereum;
        }
        if (haha?.ethereum) {
          return haha.ethereum;
        }
        if (haha && typeof haha.request === 'function') {
          return haha;
        }
      }
      return undefined;
    }
  ),
];

// Only add WalletConnect if projectId is provided
if (projectId) {
  finalConnectors.push(
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
  connectors: finalConnectors,
  publicClient,
  webSocketPublicClient,
});
