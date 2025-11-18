import { createPublicClient, http, parseAbiItem } from 'viem';
import { monadTestnet } from '~/wagmi';

type Address = `0x${string}`;

interface ContractMetadata {
  name?: string;
  symbol?: string;
  totalSupply?: string;
  decimals?: number;
  isERC20: boolean;
  isERC721: boolean;
  isERC1155: boolean;
}

/**
 * Service pour récupérer les métadonnées on-chain des contrats
 * Détecte automatiquement les tokens ERC20, ERC721, ERC1155
 */
export class ContractMetadataService {
  private client;

  constructor() {
    // Utiliser l'URL RPC configurée avec fallback
    const rpcUrl = process.env.MONAD_RPC_URL || 'https://monad-testnet.g.alchemy.com/v2/Tct1vx71u-M7UrCa_56_T_cuFdPaLV06';
    console.log(`🔗 ContractMetadataService: Utilisation du RPC ${rpcUrl.substring(0, 50)}...`);

    this.client = createPublicClient({
      chain: monadTestnet,
      transport: http(rpcUrl),
    });
  }

  /**
   * Récupère les métadonnées complètes d'un contrat
   */
  async getContractMetadata(address: Address): Promise<ContractMetadata> {
    const metadata: ContractMetadata = {
      isERC20: false,
      isERC721: false,
      isERC1155: false,
    };

    try {
      // Tenter de récupérer les métadonnées ERC20
      const erc20Data = await this.tryGetERC20Metadata(address);
      if (erc20Data) {
        Object.assign(metadata, erc20Data);
        metadata.isERC20 = true;
      }

      // Si ce n'est pas un ERC20, tenter ERC721
      if (!metadata.isERC20) {
        const erc721Data = await this.tryGetERC721Metadata(address);
        if (erc721Data) {
          Object.assign(metadata, erc721Data);
          metadata.isERC721 = true;
        }
      }

      // Vérifier ERC1155
      if (!metadata.isERC20 && !metadata.isERC721) {
        const isERC1155 = await this.tryDetectERC1155(address);
        metadata.isERC1155 = isERC1155;
      }

      return metadata;
    } catch (error) {
      console.error(`Erreur lors de la récupération des métadonnées pour ${address}:`, error);
      return metadata;
    }
  }

  /**
   * Tente de récupérer les métadonnées ERC20
   */
  private async tryGetERC20Metadata(address: Address): Promise<Partial<ContractMetadata> | null> {
    try {
      const [name, symbol, decimals] = await Promise.allSettled([
        this.client.readContract({
          address,
          abi: [parseAbiItem('function name() view returns (string)')],
          functionName: 'name',
        }),
        this.client.readContract({
          address,
          abi: [parseAbiItem('function symbol() view returns (string)')],
          functionName: 'symbol',
        }),
        this.client.readContract({
          address,
          abi: [parseAbiItem('function decimals() view returns (uint8)')],
          functionName: 'decimals',
        }),
      ]);

      // Si au moins name() ou symbol() fonctionne, c'est probablement un ERC20
      if (name.status === 'fulfilled' || symbol.status === 'fulfilled') {
        return {
          name: name.status === 'fulfilled' ? (name.value as string) : undefined,
          symbol: symbol.status === 'fulfilled' ? (symbol.value as string) : undefined,
          decimals: decimals.status === 'fulfilled' ? Number(decimals.value) : undefined,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Tente de récupérer les métadonnées ERC721
   */
  private async tryGetERC721Metadata(address: Address): Promise<Partial<ContractMetadata> | null> {
    try {
      const [name, symbol] = await Promise.allSettled([
        this.client.readContract({
          address,
          abi: [parseAbiItem('function name() view returns (string)')],
          functionName: 'name',
        }),
        this.client.readContract({
          address,
          abi: [parseAbiItem('function symbol() view returns (string)')],
          functionName: 'symbol',
        }),
      ]);

      // Vérifier si supportsInterface(0x80ac58cd) = ERC721
      try {
        const supportsERC721 = await this.client.readContract({
          address,
          abi: [parseAbiItem('function supportsInterface(bytes4) view returns (bool)')],
          functionName: 'supportsInterface',
          args: ['0x80ac58cd'],
        });

        if (supportsERC721) {
          return {
            name: name.status === 'fulfilled' ? (name.value as string) : undefined,
            symbol: symbol.status === 'fulfilled' ? (symbol.value as string) : undefined,
          };
        }
      } catch {
        // Si supportsInterface échoue mais qu'on a name/symbol, c'est peut-être quand même un NFT
        if (name.status === 'fulfilled' || symbol.status === 'fulfilled') {
          return {
            name: name.status === 'fulfilled' ? (name.value as string) : undefined,
            symbol: symbol.status === 'fulfilled' ? (symbol.value as string) : undefined,
          };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Tente de détecter si le contrat est un ERC1155
   */
  private async tryDetectERC1155(address: Address): Promise<boolean> {
    try {
      const supportsERC1155 = await this.client.readContract({
        address,
        abi: [parseAbiItem('function supportsInterface(bytes4) view returns (bool)')],
        functionName: 'supportsInterface',
        args: ['0xd9b67a26'], // ERC1155 interface ID
      });

      return supportsERC1155 as boolean;
    } catch {
      return false;
    }
  }

  /**
   * Récupère uniquement le nom du contrat (optimisé pour les appels rapides)
   */
  async getContractName(address: Address): Promise<string | null> {
    try {
      const name = await this.client.readContract({
        address,
        abi: [parseAbiItem('function name() view returns (string)')],
        functionName: 'name',
      });

      return name as string;
    } catch {
      return null;
    }
  }

  /**
   * Récupère uniquement le symbol du contrat
   */
  async getContractSymbol(address: Address): Promise<string | null> {
    try {
      const symbol = await this.client.readContract({
        address,
        abi: [parseAbiItem('function symbol() view returns (string)')],
        functionName: 'symbol',
      });

      return symbol as string;
    } catch {
      return null;
    }
  }

  /**
   * Détermine le type de contrat basé sur les métadonnées
   */
  getContractType(metadata: ContractMetadata): 'ERC20' | 'ERC721' | 'ERC1155' | 'CUSTOM' | 'UNKNOWN' {
    if (metadata.isERC20) return 'ERC20';
    if (metadata.isERC721) return 'ERC721';
    if (metadata.isERC1155) return 'ERC1155';
    if (metadata.name || metadata.symbol) return 'CUSTOM';
    return 'UNKNOWN';
  }
}
