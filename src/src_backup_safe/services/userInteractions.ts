// Service pour vérifier les interactions utilisateur avec les vraies dApps
// Utilise les mêmes données que DiscoveryModal (GitHub + Google Sheets)

import { syncDApps } from './discoveryApi';
import { SUPER_DAPPS, getAllSuperDAppContracts, findSuperDAppByContract, type SuperDApp } from '../data/superDapps';
import { getBlockVisionService } from './blockVisionApi';

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

/**
 * Service pour vérifier les interactions utilisateur avec les vraies dApps
 * Récupère les données depuis l'API Sherlock-feat-scraping
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

      // Utiliser la vraie vérification blockchain via Sherlock API
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
      let targetSuperDApps: SuperDApp[] = [];
      
      if (dappId) {
        const superDApp = SUPER_DAPPS.find((sd: any) => sd.id === dappId);
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
        checkDuration: Date.now() - Date.now() // Approximation, on pourrait mesurer le temps réel
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
   * Récupérer les vraies dApps depuis discoveryApi (GitHub + Google Sheets)
   * Utilise la même source que DiscoveryModal
   */
  private async fetchRealDapps(): Promise<RealDApp[]> {
    try {
      console.log(`🔍 Fetching real dApps from GitHub + Google Sheets (same as DiscoveryModal)...`);
      
      // Utilise la même fonction que DiscoveryModal
      const discoveryDapps = await syncDApps();
      
      // Convertir vers le format RealDApp
      const realDapps: RealDApp[] = discoveryDapps.map(dapp => ({
        id: dapp.id,
        name: dapp.name,
        description: dapp.description,
        logoUrl: dapp.logoUrl,
        category: dapp.category,
        website: dapp.website,
        github: dapp.github,
        twitter: dapp.twitter,
        contracts: [], // On ajoutera ça plus tard avec les vraies adresses
        contractCount: dapp.contractCount || 1,
        totalTxCount: dapp.totalTxCount || 0,
        uniqueUsers: dapp.uniqueUsers || 0
      }));
      
      console.log(`✅ Loaded ${realDapps.length} real dApps from discoveryApi`);
      this.usingRealData = true;
      return realDapps;
      
    } catch (error) {
      console.warn('⚠️ Failed to fetch real dApps from discoveryApi:', error);
      
      // Fallback: utiliser des données mockées
      return this.getFallbackDapps();
    }
  }

  /**
   * Fallback: utiliser des données locales si l'API n'est pas disponible
   */
  private getFallbackDapps(): RealDApp[] {
    console.log('📁 Using fallback dApps data');
    this.usingRealData = false;
    
    return [
      {
        id: "monad-testnet-faucet",
        name: "Monad Testnet Faucet",
        description: "Faucet officiel pour obtenir des tokens de test MON",
        logoUrl: null,
        category: "Infra",
        website: "https://faucet.monad.xyz",
        github: null,
        twitter: null,
        contracts: [
          {
            id: "faucet-1",
            address: "0x4f6500c07a8a483a0aabb1bc0d5b2b44abc2f3f3",
            name: "Monad Faucet",
            type: "FAUCET"
          }
        ],
        contractCount: 1,
        totalTxCount: 1200,
        uniqueUsers: 850
      }
    ];
  }

  /**
   * Obtenir les dApps avec cache (optimisation)
   */
  private async getDappsWithCache(): Promise<RealDApp[]> {
    const now = Date.now();
    
    // Utiliser le cache si valide
    if (this.cachedDapps && now < this.cacheExpiry) {
      console.log('📄 Using cached dApps data');
      return this.cachedDapps;
    }
    
    // Récupérer les nouvelles données
    const dapps = await this.fetchRealDapps();
    
    // Mettre en cache
    this.cachedDapps = dapps;
    this.cacheExpiry = now + this.CACHE_DURATION;
    
    return dapps;
  }

  /**
   * Obtenir la liste des Super dApps pour les missions
   */
  async getAvailableDapps(): Promise<Array<{ id: string; name: string; category?: string; contractCount?: number }>> {
    try {
      console.log('🌟 Loading Super dApps for missions...');
      
      // Utiliser les Super dApps avec contrats réels
      const superDapps = SUPER_DAPPS.map((dapp: any) => ({
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
