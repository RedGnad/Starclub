// Super dApps avec contrats réels pour les missions
// Données récupérées depuis GitHub protocols

export interface SuperDAppContract {
  name: string;
  address: string;
}

export interface SuperDApp {
  id: string;
  name: string;
  description: string;
  category: string;
  website?: string;
  twitter?: string;
  github?: string;
  docs?: string;
  contracts: SuperDAppContract[];
  isSuper: true; // Flag pour différencier des dApps normales
}

export const SUPER_DAPPS: SuperDApp[] = [
  {
    id: 'kuru',
    name: 'Kuru',
    description: 'Find and trade your coins on a fully on-chain CLOB. Built for traders, powered by Monad.',
    category: 'DeFi::DEX',
    website: 'https://kuru.io/',
    twitter: 'https://x.com/KuruExchange',
    github: 'https://github.com/Kuru-Labs',
    docs: 'https://docs.kuru.io/',
    isSuper: true,
    contracts: [
      { name: 'Router', address: '0xc816865f172d640d93712C68a7E1F83F3fA63235' },
      { name: 'MarginAccount', address: '0x4B186949F31FCA0aD08497Df9169a6bEbF0e26ef' },
      { name: 'KuruForwarder', address: '0x350678D87BAa7f513B262B7273ad8Ccec6FF0f78' },
      { name: 'MONUSDC', address: '0xd8336cB07D4BE511cCaF06B799851E1A80F98c71' },
      { name: 'KuruDeployer', address: '0x67a4e43C7Ce69e24d495A39c43489BC7070f009B' },
      { name: 'KuruUtils', address: '0x0Ec4760f18c70BeACDCDB2a12edde02382CF1f66' }
    ]
  },
  {
    id: 'atlantis',
    name: 'Atlantis',
    description: 'Modular V4 DEX offering cross-chain swaps, DeFi, a launchpad, farming, staking, fiat on-ramp, & more.',
    category: 'DeFi::DEX',
    website: 'https://atlantisdex.xyz',
    twitter: 'https://x.com/atlantisdex_xyz',
    docs: 'https://atlantis-dex.gitbook.io/whitepaper',
    isSuper: true,
    contracts: [
      { name: 'SwapRouter', address: '0x3012E9049d05B4B5369D690114D5A5861EbB85cb' },
      { name: 'V2SwapRouterV2', address: '0xc7E09B556E1a00cfc40b1039D6615f8423136Df7' },
      { name: 'V2SwapFactory', address: '0xa2b78D020a4521866e129E27505B6c20AE9e3852' },
      { name: 'AlgebraFactory', address: '0x10253594A832f967994b44f33411940533302ACb' },
      { name: 'QuoterV2', address: '0xa77aD9f635a3FB3bCCC5E6d1A87cB269746Aba17' },
      { name: 'NonfungiblePositionManager', address: '0x69D57B9D705eaD73a5d2f2476C30c55bD755cc2F' },
      { name: 'AtlantisSwapRouter', address: '0x0000000000001fF3684f28c67538d4D072C22734' }
    ]
  }
];

// Helper pour récupérer toutes les adresses de contrats
export function getAllSuperDAppContracts(): string[] {
  return SUPER_DAPPS.flatMap(dapp => dapp.contracts.map(c => c.address.toLowerCase()));
}

// Helper pour trouver une Super dApp par adresse de contrat
export function findSuperDAppByContract(contractAddress: string): SuperDApp | undefined {
  const normalizedAddress = contractAddress.toLowerCase();
  return SUPER_DAPPS.find(dapp => 
    dapp.contracts.some(contract => contract.address.toLowerCase() === normalizedAddress)
  );
}

// Helper pour vérifier si une dApp normale est aussi une Super dApp
export function isSuperDApp(dappName: string): boolean {
  return SUPER_DAPPS.some(superDapp => 
    superDapp.name.toLowerCase() === dappName.toLowerCase()
  );
}