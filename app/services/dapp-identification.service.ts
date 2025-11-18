/**
 * Service d'identification des dApps connues
 * Utilise plusieurs sources externes pour identifier et enrichir les dApps
 */

import axios from 'axios';

export interface IdentifiedDApp {
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  category?: string;
  tags?: string[];
  confidence: number; // 0-1
  source: 'etherscan' | 'github' | 'defillama' | 'dappradar' | 'coingecko' | 'manual';
}

/**
 * Service pour identifier les dApps connues via différentes sources
 */
export class DAppIdentificationService {
  private readonly SOURCES = {
    // Base de données locale de contrats connus (peut être étendue)
    KNOWN_CONTRACTS: new Map<string, IdentifiedDApp>([
      // Exemples de contrats Ethereum mainnet (à adapter pour Monad)
      ['0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', {
        name: 'Uniswap',
        description: 'Decentralized exchange protocol',
        logoUrl: 'https://assets.coingecko.com/coins/images/12504/small/uniswap-logo.png',
        website: 'https://uniswap.org',
        category: 'DEX',
        tags: ['dex', 'amm', 'defi'],
        confidence: 1.0,
        source: 'manual',
      }],
      // Ajouter d'autres contrats connus ici
    ]),
  };

  private initialized = false;

  constructor() {
    // Charger automatiquement les contrats connus au démarrage
    this.autoLoadKnownContracts();
  }

  /**
   * Charge automatiquement les contrats connus depuis le fichier JSON
   * (sans bloquer l'instanciation)
   */
  private async autoLoadKnownContracts(): Promise<void> {
    if (this.initialized) return;

    try {
      const path = await import('path');
      const filePath = path.join(process.cwd(), 'data', 'known-contracts.json');

      await this.loadKnownContracts(filePath);
      this.initialized = true;
      console.log('✓ Contrats connus chargés automatiquement au démarrage');
    } catch (error) {
      // Erreur silencieuse si le fichier n'existe pas (normal la première fois)
      console.log('⚠️ Aucun fichier known-contracts.json trouvé (utilisez npm run fetch:protocols)');
    }
  }

  /**
   * Identifie une dApp à partir de son adresse de contrat
   * Essaie plusieurs sources dans l'ordre de priorité
   */
  async identifyDApp(contractAddress: string): Promise<IdentifiedDApp | null> {
    const address = contractAddress.toLowerCase();

    // 1. Vérifier dans la base locale
    const knownDApp = this.SOURCES.KNOWN_CONTRACTS.get(address);
    if (knownDApp) {
      console.log(`     ✓ DApp identifiée: ${knownDApp.name} (source: ${knownDApp.source}, confidence: ${Math.round(knownDApp.confidence * 100)}%)`);
      return knownDApp;
    }

    // 2. Essayer Blockscout (explorer de Monad)
    const blockscoutResult = await this.tryBlockscout(address);
    if (blockscoutResult) return blockscoutResult;

    // 3. Essayer CoinGecko
    const coinGeckoResult = await this.tryCoinGecko(address);
    if (coinGeckoResult) return coinGeckoResult;

    // 4. Essayer DeFiLlama
    const defiLlamaResult = await this.tryDeFiLlama(address);
    if (defiLlamaResult) return defiLlamaResult;

    // 5. Essayer une recherche GitHub
    const githubResult = await this.tryGitHub(address);
    if (githubResult) return githubResult;

    return null;
  }

  /**
   * 1. Blockscout / Monad Explorer
   * Récupère les tags et métadonnées depuis l'explorer blockchain
   */
  private async tryBlockscout(address: string): Promise<IdentifiedDApp | null> {
    try {
      // URL de l'API Blockscout pour Monad testnet
      const explorerUrl = 'https://testnet.monadexplorer.com/api';

      const response = await axios.get(`${explorerUrl}/v2/addresses/${address}`, {
        timeout: 5000,
      });

      if (response.data) {
        const data = response.data;

        // Vérifier si le contrat a des métadonnées
        if (data.name || data.token?.name) {
          return {
            name: data.name || data.token?.name || 'Unknown',
            description: data.description,
            logoUrl: data.token?.icon_url,
            website: data.website,
            category: this.mapBlockscoutCategory(data.tags),
            tags: data.tags || [],
            confidence: 0.8,
            source: 'etherscan', // Blockscout = équivalent Etherscan
          };
        }
      }
    } catch (error) {
      // Blockscout peut ne pas être disponible pour Monad testnet
      console.log(`  ⚠️ Blockscout non disponible pour ${address}`);
    }

    return null;
  }

  /**
   * 2. CoinGecko API
   * Recherche via l'adresse du contrat
   */
  private async tryCoinGecko(address: string): Promise<IdentifiedDApp | null> {
    try {
      // CoinGecko ne supporte que certaines chains
      // Pour Monad, on peut chercher par similitude de nom/symbol
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/list?include_platform=true`,
        { timeout: 5000 }
      );

      // Chercher un match par adresse
      const match = response.data.find((coin: any) => {
        return Object.values(coin.platforms || {}).some(
          (addr: any) => addr?.toLowerCase() === address
        );
      });

      if (match) {
        // Récupérer les détails
        const detailsResponse = await axios.get(
          `https://api.coingecko.com/api/v3/coins/${match.id}`,
          { timeout: 5000 }
        );

        const details = detailsResponse.data;

        return {
          name: details.name,
          description: details.description?.en,
          logoUrl: details.image?.large,
          website: details.links?.homepage?.[0],
          category: this.mapCoinGeckoCategory(details.categories),
          tags: details.categories || [],
          confidence: 0.9,
          source: 'coingecko',
        };
      }
    } catch (error) {
      console.log(`  ⚠️ CoinGecko lookup failed for ${address}`);
    }

    return null;
  }

  /**
   * 3. DeFiLlama API
   * Base de données de protocoles DeFi
   */
  private async tryDeFiLlama(address: string): Promise<IdentifiedDApp | null> {
    try {
      // DeFiLlama API publique
      const response = await axios.get(
        'https://api.llama.fi/protocols',
        { timeout: 5000 }
      );

      // Chercher un protocole avec cette adresse
      const match = response.data.find((protocol: any) => {
        // DeFiLlama stocke les adresses de différentes manières
        const addresses = [
          protocol.address,
          ...(protocol.chainTvls?.monad?.tokensInUsd || []).map((t: any) => t.address),
        ].filter(Boolean);

        return addresses.some((addr: string) => addr.toLowerCase() === address);
      });

      if (match) {
        return {
          name: match.name,
          description: match.description,
          logoUrl: match.logo,
          website: match.url,
          category: 'DEFI',
          tags: [match.category, ...(match.chains || [])],
          confidence: 0.95,
          source: 'defillama',
        };
      }
    } catch (error) {
      console.log(`  ⚠️ DeFiLlama lookup failed for ${address}`);
    }

    return null;
  }

  /**
   * 4. GitHub Search
   * Recherche dans les dépôts GitHub pour des références au contrat
   */
  private async tryGitHub(address: string): Promise<IdentifiedDApp | null> {
    try {
      // GitHub Code Search API
      const response = await axios.get(
        `https://api.github.com/search/code?q=${address}+language:solidity`,
        {
          timeout: 5000,
          headers: {
            Accept: 'application/vnd.github+json',
            // Note: Pour plus de requêtes, ajouter un token GitHub
            // Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          },
        }
      );

      if (response.data.total_count > 0) {
        const firstResult = response.data.items[0];

        // Extraire le nom du repo comme nom potentiel de dApp
        const repoName = firstResult.repository.name;
        const repoDescription = firstResult.repository.description;

        return {
          name: this.cleanRepoName(repoName),
          description: repoDescription,
          website: firstResult.repository.homepage || firstResult.repository.html_url,
          category: 'UNKNOWN',
          tags: ['github', 'open-source'],
          confidence: 0.6,
          source: 'github',
        };
      }
    } catch (error) {
      // GitHub rate limiting est très restrictif sans token
      console.log(`  ⚠️ GitHub search unavailable (rate limit?)`);
    }

    return null;
  }

  /**
   * Mapper les catégories Blockscout vers nos catégories
   */
  private mapBlockscoutCategory(tags: string[] = []): string {
    const tagMap: Record<string, string> = {
      'dex': 'DEX',
      'defi': 'DEFI',
      'lending': 'LENDING',
      'nft': 'NFT',
      'marketplace': 'NFT_MARKETPLACE',
      'bridge': 'BRIDGE',
      'gaming': 'GAMEFI',
      'social': 'SOCIAL',
      'governance': 'GOVERNANCE',
    };

    for (const tag of tags) {
      const mapped = tagMap[tag.toLowerCase()];
      if (mapped) return mapped;
    }

    return 'UNKNOWN';
  }

  /**
   * Mapper les catégories CoinGecko vers nos catégories
   */
  private mapCoinGeckoCategory(categories: string[] = []): string {
    const categoryMap: Record<string, string> = {
      'decentralized-exchange': 'DEX',
      'automated-market-maker-amm': 'DEX',
      'lending-borrowing': 'LENDING',
      'non-fungible-tokens-nft': 'NFT',
      'gaming-metaverse': 'GAMEFI',
      'decentralized-finance-defi': 'DEFI',
      'governance': 'GOVERNANCE',
    };

    for (const category of categories) {
      const mapped = categoryMap[category.toLowerCase()];
      if (mapped) return mapped;
    }

    return 'DEFI';
  }

  /**
   * Nettoyer le nom de repo GitHub pour en faire un nom de dApp
   */
  private cleanRepoName(repoName: string): string {
    return repoName
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Rechercher dans DappRadar
   * Note: DappRadar n'a pas d'API publique gratuite
   * Cette méthode est un placeholder pour une future intégration
   */
  private async tryDappRadar(address: string): Promise<IdentifiedDApp | null> {
    // DappRadar nécessite un plan payant pour l'API
    // Placeholder pour future implémentation
    return null;
  }

  /**
   * Ajouter manuellement une dApp connue à la base locale
   */
  addKnownContract(address: string, dapp: IdentifiedDApp): void {
    this.SOURCES.KNOWN_CONTRACTS.set(address.toLowerCase(), dapp);
    console.log(`✓ Contrat connu ajouté: ${address} → ${dapp.name}`);
  }

  /**
   * Charger une liste de contrats connus depuis un fichier JSON
   */
  async loadKnownContracts(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const data = await fs.readFile(filePath, 'utf-8');
      const contracts = JSON.parse(data);

      for (const [address, dapp] of Object.entries(contracts)) {
        this.addKnownContract(address, dapp as IdentifiedDApp);
      }

      console.log(`✓ ${Object.keys(contracts).length} contrats connus chargés depuis ${filePath}`);
    } catch (error) {
      console.error(`❌ Erreur lors du chargement des contrats connus:`, error);
    }
  }

  /**
   * Exporter la base de contrats connus vers un fichier JSON
   */
  async exportKnownContracts(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const contracts = Object.fromEntries(this.SOURCES.KNOWN_CONTRACTS);
      await fs.writeFile(filePath, JSON.stringify(contracts, null, 2));
      console.log(`✓ ${this.SOURCES.KNOWN_CONTRACTS.size} contrats exportés vers ${filePath}`);
    } catch (error) {
      console.error(`❌ Erreur lors de l'export des contrats:`, error);
    }
  }
}

// Export singleton
export const dappIdentificationService = new DAppIdentificationService();
