// Service pour vérifier les interactions utilisateur avec les vraies dApps
// Version backend - adaptée pour Express

import { getBlockVisionService } from './blockVisionApi.js';
import { SUPER_DAPPS, getAllSuperDAppContracts, findSuperDAppByContract, type SuperDApp } from '../data/superDapps.js';

export interface DAppContract {
  id: string;
  address: string;
  name: string | null;
  type: string | null;
}

export interface RealDApp {
  id: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  category: string | null;
  website: string | null;
  github: string | null;
  twitter: string | null;
  contracts: DAppContract[];
  contractCount: number;
  totalTxCount: number;
  uniqueUsers: number;
}

export interface DAppInteractionCheck {
  dappName: string;
  dappId: string;
  hasInteracted: boolean;
  lastInteraction?: Date;
  transactionCount: number;
  contractAddresses: string[];
  contractsUsed?: Array<{
    address: string;
    name: string;
    interactionCount: number;
  }>;
}

export interface UserInteractionResult {
  userAddress: string;
  totalDappsInteracted: number;
  interactions: DAppInteractionCheck[];
  checkDuration: number; // en ms
}

// SuperDApps importées depuis le fichier data séparé

/**
 * Service pour vérifier les interactions utilisateur avec les vraies dApps
 */
export class UserInteractionsService {
  private static instance: UserInteractionsService;
  private cachedDapps: RealDApp[] | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
  private usingRealData = false;

  static getInstance(): UserInteractionsService {
    if (!this.instance) {
      this.instance = new UserInteractionsService();
    }
    return this.instance;
  }

  /**
   * Forcer le rechargement des dApps (invalide le cache)
   */
  refreshDapps(): void {
    console.log(`🔄 Forcing dApps refresh...`);
    this.cachedDapps = null;
    this.cacheExpiry = 0;
  }

  /**
   * Vérifier si on utilise les vraies données ou fallback
   */
  isUsingRealData(): boolean {
    return this.usingRealData;
  }

  /**
   * Vérifier si un utilisateur a interagi avec une dApp spécifique dans les dernières 24h
   */
  async checkUserInteractionWith24h(
    userAddress: string,
    dappId?: string
  ): Promise<UserInteractionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Vérification des interactions pour ${userAddress}...`);

      // Utiliser la vraie vérification blockchain via BlockVision
      const result = await this.getRealBlockchainInteractions(userAddress, dappId);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Vérification terminée en ${duration}ms`);
      
      return {
        ...result,
        checkDuration: duration
      };
      
    } catch (error) {
      console.error('Erreur lors de la vérification:', error);
      return {
        userAddress,
        totalDappsInteracted: 0,
        interactions: [],
        checkDuration: Date.now() - startTime
      };
    }
  }

  /**
   * Vraie vérification blockchain via BlockVision API (Production)
   */
  private async getRealBlockchainInteractions(
    userAddress: string,
    dappId?: string
  ): Promise<UserInteractionResult> {
    try {
      console.log('🌐 REAL BLOCKCHAIN: Using BlockVision API...');
      
      const blockVision = getBlockVisionService();
      
      // Si un dappId spécifique est demandé, chercher ses contrats
      let contractsToCheck: string[] = [];
      let targetSuperDApps: any[] = [];
      
      if (dappId) {
        const superDApp = SUPER_DAPPS.find(sd => sd.id === dappId);
        if (superDApp) {
          contractsToCheck = superDApp.contracts.map((c: any) => c.address);
          targetSuperDApps = [superDApp];
        }
      } else {
        // Vérifier tous les contrats des Super dApps
        contractsToCheck = getAllSuperDAppContracts();
        targetSuperDApps = SUPER_DAPPS;
      }

      console.log(`🔍 Checking ${contractsToCheck.length} contracts for ${targetSuperDApps.length} Super dApps`);

      // Appel BlockVision API
      const result = await blockVision.checkUserInteractionsLast24h(
        userAddress,
        contractsToCheck
      );

      if (!result.hasActivity) {
        console.log('📭 No blockchain interactions found in last 24h');
        return {
          userAddress,
          totalDappsInteracted: 0,
          interactions: [],
          checkDuration: 0
        };
      }

      // Mapper les contrats trouvés vers les Super dApps
      const interactions: DAppInteractionCheck[] = [];
      const processedDApps = new Set<string>();

      for (const contractAddress of result.contractsInteracted) {
        const superDApp = findSuperDAppByContract(contractAddress);
        
        if (superDApp && !processedDApps.has(superDApp.id)) {
          processedDApps.add(superDApp.id);
          
          // Compter les contrats de cette dApp qui ont eu des interactions
          const dappContractAddresses = superDApp.contracts.map((c: any) => c.address.toLowerCase());
          const interactedContracts = result.contractsInteracted.filter(addr => 
            dappContractAddresses.includes(addr.toLowerCase())
          );

          interactions.push({
            dappId: superDApp.id,
            dappName: superDApp.name,
            hasInteracted: true,
            lastInteraction: result.lastActivityDate || new Date(),
            transactionCount: result.transactionCount,
            contractAddresses: interactedContracts,
            contractsUsed: interactedContracts.map(addr => {
              const contract = superDApp.contracts.find((c: any) => 
                c.address.toLowerCase() === addr.toLowerCase()
              );
              return {
                address: addr,
                name: contract?.name || 'Unknown Contract',
                interactionCount: 1 // BlockVision pourrait fournir plus de détails
              };
            })
          });
        }
      }

      console.log(`✅ REAL BLOCKCHAIN: Found ${interactions.length} Super dApps with verified interactions`);
      console.log(`📊 Total transactions: ${result.transactionCount}, Contracts: ${result.contractsInteracted.length}`);

      return {
        userAddress,
        totalDappsInteracted: interactions.length,
        interactions,
        checkDuration: Date.now() - Date.now() // Approximation
      };

    } catch (error) {
      console.error('❌ REAL BLOCKCHAIN: BlockVision API failed:', error);
      
      // En cas d'erreur API, retourner un résultat vide
      return {
        userAddress,
        totalDappsInteracted: 0,
        interactions: [],
        checkDuration: 0
      };
    }
  }

  /**
   * Obtenir la liste des Super dApps pour les missions
   */
  async getAvailableDapps(): Promise<Array<{ id: string; name: string; category?: string; contractCount?: number }>> {
    try {
      console.log('🌟 Loading Super dApps for missions...');
      
      // Utiliser les Super dApps avec contrats réels
      const superDapps = SUPER_DAPPS.map(dapp => ({
        id: dapp.id,
        name: dapp.name,
        category: dapp.category,
        contractCount: dapp.contracts.length
      }));

      this.usingRealData = true;
      console.log(`✅ Loaded ${superDapps.length} Super dApps with real contracts`);
      
      return superDapps;
      
    } catch (error) {
      console.error('Error getting Super dApps:', error);
      
      // Retour sur fallback simple en cas d'erreur
      this.usingRealData = false;
      return [
        { id: "fallback", name: "Monad Testnet (fallback)", category: "System" }
      ];
    }
  }
}

// Export singleton
export function getUserInteractionsService(): UserInteractionsService {
  return UserInteractionsService.getInstance();
}
