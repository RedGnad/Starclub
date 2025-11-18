import { ContractMetadataService } from './contract-metadata.service';
import { DAppIdentificationService } from './dapp-identification.service';
import { prisma } from '~/lib/db/prisma';

type Address = `0x${string}`;

interface EnrichedMetadata {
  name?: string;
  symbol?: string;
  logoUrl?: string;
  website?: string;
  description?: string;
}

/**
 * Service d'enrichissement des métadonnées des dApps
 * Combine les données on-chain avec des sources externes
 */
export class MetadataEnrichmentService {
  private contractMetadataService: ContractMetadataService;
  private dappIdentificationService: DAppIdentificationService;

  constructor() {
    this.contractMetadataService = new ContractMetadataService();
    this.dappIdentificationService = new DAppIdentificationService();
  }

  /**
   * Enrichit une dApp avec toutes les métadonnées disponibles
   */
  async enrichDApp(dappId: string): Promise<void> {
    try {
      // Récupérer la dApp et ses contrats
      const dapp = await prisma.dApp.findUnique({
        where: { id: dappId },
        include: {
          contracts: {
            orderBy: { deploymentDate: 'asc' },
            take: 1, // Prendre le contrat le plus ancien (probablement le contrat principal)
          },
        },
      });

      if (!dapp || dapp.contracts.length === 0) {
        console.log(`⚠️ DApp ${dappId} n'a pas de contrats`);
        return;
      }

      const mainContract = dapp.contracts[0];

      // NOUVEAU : Essayer d'identifier la dApp via sources externes
      console.log(`🔍 Identification de la dApp via sources externes...`);
      const identifiedDApp = await this.dappIdentificationService.identifyDApp(mainContract.address);

      // Récupérer les métadonnées on-chain
      const onChainMetadata = await this.getOnChainMetadata(mainContract.address as Address);

      // Récupérer le logo depuis des sources externes
      const logoUrl = await this.getLogoUrl(mainContract.address as Address, onChainMetadata.symbol);

      // Mettre à jour la dApp avec les nouvelles métadonnées
      const updateData: any = {};

      // Priorité 1 : Données de l'identification externe (si trouvées)
      if (identifiedDApp) {
        console.log(`✓ DApp identifiée: ${identifiedDApp.name} (source: ${identifiedDApp.source}, confidence: ${Math.round(identifiedDApp.confidence * 100)}%)`);

        if (identifiedDApp.name && !dapp.name) {
          updateData.name = identifiedDApp.name;
        }

        if (identifiedDApp.description && !dapp.description) {
          updateData.description = identifiedDApp.description;
        }

        if (identifiedDApp.logoUrl && !dapp.logoUrl) {
          updateData.logoUrl = identifiedDApp.logoUrl;
        }

        if (identifiedDApp.website && !dapp.website) {
          updateData.website = identifiedDApp.website;
        }

        // Mettre à jour la catégorie si la confidence est élevée
        if (identifiedDApp.category && identifiedDApp.confidence >= 0.7 && dapp.category === 'UNKNOWN') {
          updateData.category = identifiedDApp.category;
        }
      }

      // Priorité 2 : Données on-chain (si pas trouvées via identification)
      if (onChainMetadata.name && !updateData.name && !dapp.name) {
        updateData.name = onChainMetadata.name;
      }

      if (onChainMetadata.symbol && !dapp.symbol) {
        updateData.symbol = onChainMetadata.symbol;
      }

      if (logoUrl && !updateData.logoUrl && !dapp.logoUrl) {
        updateData.logoUrl = logoUrl;
      }

      // Générer une description si on a des infos mais pas via identification
      if (!updateData.description && !dapp.description && (onChainMetadata.name || onChainMetadata.symbol)) {
        updateData.description = this.generateDescription(onChainMetadata, dapp.category);
      }

      // Mettre à jour seulement si on a de nouvelles données
      if (Object.keys(updateData).length > 0) {
        await prisma.dApp.update({
          where: { id: dappId },
          data: updateData,
        });

        console.log(`✓ DApp ${dappId} enrichie:`, updateData);
      }
    } catch (error) {
      console.error(`❌ Erreur lors de l'enrichissement de la dApp ${dappId}:`, error);
    }
  }

  /**
   * Récupère les métadonnées on-chain d'un contrat
   */
  private async getOnChainMetadata(address: Address): Promise<EnrichedMetadata> {
    console.log(`📡 Récupération métadonnées on-chain pour ${address}...`);
    const metadata = await this.contractMetadataService.getContractMetadata(address);

    console.log(`  → name: ${metadata.name || 'non trouvé'}, symbol: ${metadata.symbol || 'non trouvé'}`);

    return {
      name: metadata.name,
      symbol: metadata.symbol,
    };
  }

  /**
   * Récupère l'URL du logo depuis différentes sources
   */
  private async getLogoUrl(address: Address, symbol?: string): Promise<string | undefined> {
    // 1. TrustWallet Assets (pour les tokens connus)
    if (symbol) {
      const trustWalletUrl = await this.tryTrustWalletLogo(address);
      if (trustWalletUrl) return trustWalletUrl;
    }

    // 2. CoinGecko API (pour les tokens listés)
    if (symbol) {
      const coinGeckoUrl = await this.tryCoinGeckoLogo(symbol);
      if (coinGeckoUrl) return coinGeckoUrl;
    }

    // 3. Fallback: générer une icône basée sur l'adresse
    return this.generateAvatarUrl(address);
  }

  /**
   * Tente de récupérer le logo depuis TrustWallet Assets
   */
  private async tryTrustWalletLogo(address: Address): Promise<string | undefined> {
    try {
      // TrustWallet utilise des checksummed addresses
      const checksummedAddress = address; // Viem retourne déjà des checksummed addresses

      // Format: https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/{address}/logo.png
      // Note: TrustWallet ne supporte pas encore Monad, mais on peut essayer avec Ethereum pour les tokens connus
      const url = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${checksummedAddress}/logo.png`;

      // Vérifier si l'image existe
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return url;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Tente de récupérer le logo depuis CoinGecko
   */
  private async tryCoinGeckoLogo(symbol: string): Promise<string | undefined> {
    try {
      // CoinGecko API (gratuite mais limitée)
      const response = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`
      );

      if (!response.ok) return undefined;

      const data = await response.json();

      // Prendre le premier résultat qui correspond au symbole
      const coin = data.coins?.find((c: any) =>
        c.symbol?.toLowerCase() === symbol.toLowerCase()
      );

      if (coin?.large) {
        return coin.large;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Génère une URL d'avatar basée sur l'adresse du contrat
   * Utilise DiceBear API pour générer des avatars déterministes
   */
  private generateAvatarUrl(address: Address): string {
    // DiceBear API génère des avatars SVG déterministes basés sur un seed
    // https://www.dicebear.com/styles/identicon/
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${address}&backgroundColor=1e293b&scale=80`;
  }

  /**
   * Génère une description basique basée sur les métadonnées
   */
  private generateDescription(metadata: EnrichedMetadata, category: string): string {
    const parts: string[] = [];

    if (metadata.name && metadata.symbol) {
      parts.push(`${metadata.name} (${metadata.symbol})`);
    } else if (metadata.name) {
      parts.push(metadata.name);
    } else if (metadata.symbol) {
      parts.push(metadata.symbol);
    }

    // Ajouter la catégorie
    const categoryLabels: Record<string, string> = {
      DEFI: 'protocole DeFi',
      NFT: 'collection NFT',
      GAMEFI: 'jeu blockchain',
      SOCIAL: 'application sociale',
      BRIDGE: 'pont blockchain',
      INFRA: 'infrastructure',
    };

    const categoryLabel = categoryLabels[category] || 'application décentralisée';

    if (parts.length > 0) {
      parts.push(`- ${categoryLabel} découvert automatiquement sur Monad testnet`);
    } else {
      parts.push(`Application décentralisée (${categoryLabel}) découverte sur Monad testnet`);
    }

    return parts.join(' ');
  }

  /**
   * Enrichit un contrat avec ses métadonnées
   */
  async enrichContract(contractAddress: string): Promise<void> {
    try {
      const metadata = await this.contractMetadataService.getContractMetadata(contractAddress as Address);

      const updateData: any = {};

      // Déterminer le type de contrat
      const contractType = this.contractMetadataService.getContractType(metadata);
      if (contractType !== 'UNKNOWN') {
        updateData.type = contractType;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.contract.update({
          where: { address: contractAddress },
          data: updateData,
        });

        console.log(`✓ Contrat ${contractAddress} enrichi avec le type ${contractType}`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors de l'enrichissement du contrat ${contractAddress}:`, error);
    }
  }
}
