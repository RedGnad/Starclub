// Service BlockVision pour Monad - Production Ready
// Documentation: https://docs.blockvision.org/reference/monad-indexing-api

interface BlockVisionTransaction {
  hash: string;
  from: string;
  to: string;
  timestamp: number;
  blockNumber: number;
  gasUsed: number;
  status: number; // 1 pour succès, 0 pour échec selon doc
  value: string;
  methodName?: string;
}

interface BlockVisionResult {
  data: BlockVisionTransaction[];
  nextPageCursor: string;
  total: number;
}

interface BlockVisionResponse {
  code: number; // 0 pour succès selon doc
  message: string;
  reason?: string;
  result: BlockVisionResult;
}

interface ActivityCheckResult {
  hasActivity: boolean;
  lastActivityDate?: Date;
  transactionCount: number;
  contractsInteracted: string[];
}

export class BlockVisionService {
  private readonly API_BASE = 'https://api.blockvision.org/v2';
  private readonly API_KEY: string;
  private readonly NETWORK = 'monad-testnet'; // Sera 'monad-mainnet' plus tard

  constructor(apiKey?: string) {
    // Priorité : paramètre > env variable > demo key
    this.API_KEY = apiKey || process.env.REACT_APP_BLOCKVISION_API_KEY || 'demo-key';
    
    if (this.API_KEY === 'demo-key' || this.API_KEY === 'your_blockvision_api_key_here') {
      console.warn('⚠️ BlockVision: Using demo key - limited to 30 calls/month');
      console.warn('💡 Get your API key: https://dashboard.blockvision.org/pricing');
    }
  }

  /**
   * Vérifier si un utilisateur a des transactions vers des contrats spécifiques dans les dernières 24h
   */
  async checkUserInteractionsLast24h(
    userAddress: string,
    contractAddresses: string[]
  ): Promise<ActivityCheckResult> {
    
    console.log(`🔍 BlockVision: Checking ${userAddress} interactions with ${contractAddresses.length} contracts`);
    
    try {
      // Calculer la plage de temps (24h)
      const now = Math.floor(Date.now() / 1000);
      const yesterday = now - (24 * 60 * 60);

      // Récupérer les transactions de l'utilisateur
      const transactions = await this.getUserTransactions(userAddress, yesterday);
      
      if (!transactions || transactions.length === 0) {
        console.log('📭 No transactions found in last 24h');
        return {
          hasActivity: false,
          transactionCount: 0,
          contractsInteracted: []
        };
      }

      // DEBUG: Loggons TOUS les contrats pour investigation
      console.log('🔍 DEBUG: Contrats dans tes transactions:');
      const contractSet = new Set(transactions.map(tx => tx.to).filter(Boolean));
      const uniqueContracts = Array.from(contractSet);
      uniqueContracts.forEach(contract => {
        console.log(`   📄 ${contract}`);
      });
      
      console.log('🎯 DEBUG: Contrats Atlantis qu\'on recherche:');
      contractAddresses.forEach(addr => {
        console.log(`   🔍 ${addr}`);
      });

      // Filtrer les transactions vers nos contrats
      const targetContractSet = new Set(contractAddresses.map(addr => addr.toLowerCase()));
      const relevantTransactions = transactions.filter(tx => 
        tx.to && targetContractSet.has(tx.to.toLowerCase())
      );

      if (relevantTransactions.length === 0) {
        console.log('🔍 No interactions with target contracts found');
        return {
          hasActivity: false,
          transactionCount: transactions.length,
          contractsInteracted: []
        };
      }

      // Analyser les résultats
      const interactedContractSet = new Set(relevantTransactions.map(tx => tx.to.toLowerCase()));
      const interactedContracts = Array.from(interactedContractSet);
      
      const latestTransaction = relevantTransactions
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      console.log(`✅ Found ${relevantTransactions.length} interactions with ${interactedContracts.length} contracts`);

      return {
        hasActivity: true,
        lastActivityDate: new Date(latestTransaction.timestamp),
        transactionCount: relevantTransactions.length,
        contractsInteracted: interactedContracts
      };

    } catch (error) {
      console.error('❌ BlockVision API error:', error);
      
      // Fallback: retourner false en cas d'erreur API
      return {
        hasActivity: false,
        transactionCount: 0,
        contractsInteracted: [],
      };
    }
  }

  /**
   * Récupérer les transactions d'un utilisateur depuis une date
   */
  private async getUserTransactions(
    userAddress: string,
    fromTimestamp: number
  ): Promise<BlockVisionTransaction[]> {
    
    // BlockVision API format selon documentation officielle
    const url = `${this.API_BASE}/monad/account/transactions`;
    
    const params = new URLSearchParams({
      address: userAddress,
      limit: '50', // Maximum selon doc
      ascendingOrder: 'false' // Plus récents en premier
    });

    console.log(`🌐 BlockVision API call: ${url}?${params}`);

    const response = await fetch(`${url}?${params}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-API-Key': this.API_KEY, // API Key en header selon standards REST
        'User-Agent': 'Sherlock-dApp-Verifier/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`BlockVision API error: ${response.status} ${response.statusText}`);
    }

    const data: BlockVisionResponse = await response.json();

    if (data.code !== 0) {
      console.warn(`⚠️ BlockVision API warning: ${data.message} (${data.reason || 'Unknown reason'})`);
      return [];
    }

    if (!data.result || !data.result.data) {
      console.warn(`⚠️ BlockVision API: No transaction data returned`);
      return [];
    }

    const transactions = data.result.data;

    // Filtrer par timestamp (24h) côté client - timestamp est en millisecondes selon doc
    const validTransactions = transactions.filter(tx => 
      tx.timestamp >= fromTimestamp
    );

    console.log(`📊 ${transactions.length} total transactions, ${validTransactions.length} in last 24h`);
    
    return validTransactions;
  }

  /**
   * Test de connexion à l'API BlockVision
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test avec une adresse connue
      const testAddress = '0x0000000000000000000000000000000000000000';
      await this.getUserTransactions(testAddress, 0);
      console.log('✅ BlockVision API connection successful');
      return true;
    } catch (error) {
      console.error('❌ BlockVision API connection failed:', error);
      return false;
    }
  }

  /**
   * Obtenir des infos sur le rate limiting
   */
  getRateLimitInfo(): { freeCallsPerMonth: number; pricing: string } {
    return {
      freeCallsPerMonth: 30,
      pricing: 'Lite: $20/month, Basic: $50/month, Pro: $200/month'
    };
  }
}

// Singleton pour éviter les multiples instances
let blockVisionInstance: BlockVisionService | null = null;

export function getBlockVisionService(apiKey?: string): BlockVisionService {
  if (!blockVisionInstance) {
    blockVisionInstance = new BlockVisionService(apiKey);
  }
  return blockVisionInstance;
}

export default BlockVisionService;
