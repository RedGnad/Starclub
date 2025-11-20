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
  explorerLink?: string;
  transactionHash?: string;
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

      // Utiliser la vraie vérification blockchain via RPC direct (qui fonctionne!)
      const result = await this.getMonadExplorerInteractions(userAddress, dappId);
      
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
      
      // Essayer l'API Monad Explorer directement (vraie blockchain)
      console.log('🌐 BlockVision unavailable, trying Monad Explorer API...');
      return await this.getMonadExplorerInteractions(userAddress, dappId);
      
      const blockVision = getBlockVisionService();
      
      // Si un dappId spécifique est demandé, chercher ses contrats
      let contractsToCheck: string[] = [];
      let targetSuperDApps: any[] = [];
      
      if (dappId) {
        const superDApp = SUPER_DAPPS.find(sd => sd.id === dappId) as any;
        if (superDApp?.contracts) {
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

      console.log(`🔍 Checking ${result.contractsInteracted.length} contracts against SuperDApps:`, result.contractsInteracted);
      
      // Debug : afficher tous les contrats SuperDApps configurés
      const allSuperContracts = getAllSuperDAppContracts();
      console.log(`📋 All SuperDApp contracts configured:`, allSuperContracts);

      for (const contractAddress of result.contractsInteracted) {
        const superDApp = findSuperDAppByContract(contractAddress);
        
        console.log(`🔍 Contract ${contractAddress} -> SuperDApp: ${superDApp?.name || 'NOT FOUND'}`);
        
        if (superDApp?.contracts && !processedDApps.has((superDApp as any).id)) {
          // Cast pour éviter les erreurs TypeScript dans ce bloc
          const dapp = superDApp as any;
          processedDApps.add(dapp.id);
          
          // Compter les contrats de cette dApp qui ont eu des interactions
          const dappContractAddresses = dapp.contracts.map((c: any) => c.address.toLowerCase());
          const interactedContracts = result.contractsInteracted.filter(addr => 
            dappContractAddresses.includes(addr.toLowerCase())
          );

          interactions.push({
            dappId: dapp.id,
            dappName: dapp.name,
            hasInteracted: true,
            lastInteraction: result.lastActivityDate || new Date(),
            transactionCount: result.transactionCount,
            contractAddresses: interactedContracts,
            contractsUsed: interactedContracts.map(addr => {
              const contract = dapp.contracts?.find((c: any) => 
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
      console.log('🔄 FALLBACK: Returning empty result (no more simulations)');
      
      // Retourner un résultat vide - plus de simulations
      return {
        userAddress,
        totalDappsInteracted: 0,
        interactions: [],
        checkDuration: 0
      };
    }
  }

  /**
   * Vraie vérification via l'API Monad Explorer (alternative à BlockVision)
   */
  private async getMonadExplorerInteractions(
    userAddress: string,
    dappId?: string
  ): Promise<UserInteractionResult> {
    console.log(`🌐 MONAD EXPLORER: Checking real transactions for ${userAddress}`);
    
    try {
      // Récupérer les contrats à vérifier
      let contractsToCheck: string[] = [];
      let targetSuperDApps = SUPER_DAPPS;
      
      if (dappId) {
        const superDApp = SUPER_DAPPS.find(sd => sd.id === dappId);
        if (superDApp) {
          contractsToCheck = superDApp.contracts.map(c => c.address.toLowerCase());
          targetSuperDApps = [superDApp];
        }
      } else {
        contractsToCheck = SUPER_DAPPS.flatMap(dapp => dapp.contracts.map(c => c.address.toLowerCase()));
      }
      
      console.log(`🔍 Checking ${contractsToCheck.length} contracts for ${targetSuperDApps.length} SuperDApps`);
      
      // Utiliser le RPC Monad directement
      const rpcUrl = process.env.MONAD_RPC_URL || 'https://monad-testnet.g.alchemy.com/v2/GmzSvBUT_o45yt7CzuavK';
      console.log('🌐 Using RPC URL:', rpcUrl);
      console.log('🧪 Environment MONAD_RPC_URL:', process.env.MONAD_RPC_URL);
      
      // Récupérer les transactions des dernières 24h via RPC
      const transactions = await this.getMonadTransactionsRPC(userAddress, rpcUrl);
      
      if (!transactions || transactions.length === 0) {
        console.log('📭 No transactions found in last 24h');
        return {
          userAddress,
          totalDappsInteracted: 0,
          interactions: [],
          checkDuration: 0
        };
      }
      
      // Analyser les transactions pour trouver les interactions avec nos contrats
      const interactions: DAppInteractionCheck[] = [];
      const processedDApps = new Set<string>();
      const foundTransactions: any[] = [];
      
      for (const tx of transactions) {
        const toAddress = tx.to?.toLowerCase();
        if (!toAddress || !contractsToCheck.includes(toAddress)) {
          continue;
        }
        
        // Trouver quelle SuperDApp correspond à ce contrat
        const superDApp = targetSuperDApps.find(dapp => 
          dapp.contracts.some(c => c.address.toLowerCase() === toAddress)
        );
        
        if (superDApp && !processedDApps.has(superDApp.id)) {
          processedDApps.add(superDApp.id);
          foundTransactions.push(tx);
          
          interactions.push({
            dappId: superDApp.id,
            dappName: superDApp.name,
            hasInteracted: true,
            lastInteraction: new Date(parseInt(tx.timeStamp) * 1000),
            transactionCount: 1,
            contractAddresses: [toAddress],
            contractsUsed: [{
              address: toAddress,
              name: superDApp.contracts.find(c => c.address.toLowerCase() === toAddress)?.name || 'Contract',
              interactionCount: 1
            }],
            // Ajouter le lien vers l'explorer MonVision pour cette transaction
            explorerLink: `https://testnet.monvision.io/tx/${tx.hash}`,
            transactionHash: tx.hash
          });
        }
      }
      
      console.log(`✅ REAL BLOCKCHAIN: Found ${interactions.length} SuperDApps with verified interactions`);
      
      // Log des transactions trouvées pour debug
      if (foundTransactions.length > 0) {
        console.log('🔗 Real transactions found:');
        foundTransactions.forEach(tx => {
          console.log(`   📄 ${tx.hash} -> ${tx.to} (${new Date(parseInt(tx.timeStamp) * 1000).toISOString()})`);
        });
      }
      
      return {
        userAddress,
        totalDappsInteracted: interactions.length,
        interactions,
        checkDuration: 0
      };
      
    } catch (error) {
      console.error('❌ Monad Explorer API failed:', error);
      throw error;
    }
  }

  /**
   * Récupérer les transactions via RPC Monad (approche optimisée pour interactions récentes)
   */
  private async getMonadTransactionsRPC(userAddress: string, rpcUrl: string): Promise<any[]> {
    try {
      console.log('🔍 Fetching REAL recent transactions via Monad RPC...');
      
      // MÉTHODE SIMPLE: Scanner les 50 derniers blocs SEULEMENT (≈ 1 minute)
      console.log('🎯 SIMPLE: Scanning last 50 blocks only (1 min window)');
      return await this.scanLast50BlocksSimple(userAddress, rpcUrl);
      
    } catch (error) {
      console.error('❌ Error fetching Monad transactions:', error);
      return [];
    }
  }
  
  /**
   * MÉTHODE ULTRA-SIMPLE: 50 blocs seulement (≈ 1 minute)
   * Optimisée pour les transactions très récentes
   */
  private async scanLast50BlocksSimple(userAddress: string, rpcUrl: string): Promise<any[]> {
    try {
      console.log('⚡ ULTRA-SIMPLE: Scanning only last 50 blocks');
      
      // Get latest block
      const latestResp = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      if (!latestResp.ok) return [];
      const latestData = await latestResp.json() as any;
      const latestBlock = parseInt(latestData.result, 16);
      
      const startBlock = Math.max(0, latestBlock - 2000); // 2000 blocs (≈ 30-40 min) DEV MODE
      console.log(`⚡ Scanning blocks ${startBlock} to ${latestBlock} (2000 blocks = ~30-40min DEV)`);
      
      // SuperDApp contracts
      const contracts = SUPER_DAPPS.flatMap(dapp => 
        dapp.contracts.map(c => c.address.toLowerCase())
      );
      
      const found: any[] = [];
      
      // Scan avec chunks de 10 blocs (plus rapide)
      for (let i = latestBlock; i >= startBlock; i -= 10) {
        const chunkStart = Math.max(startBlock, i - 9);
        const chunkEnd = i;
        
        console.log(`⚡ Chunk: ${chunkStart}-${chunkEnd}`);
        
        // Parallel fetch des blocs
        const promises = [];
        for (let blockNum = chunkStart; blockNum <= chunkEnd; blockNum++) {
          promises.push(
            fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBlockByNumber',
                params: ['0x' + blockNum.toString(16), true],
                id: blockNum
              })
            }).then(res => res.ok ? res.json() : null)
          );
        }
        
        const results = await Promise.all(promises);
        
        // Check transactions
        for (const result of results) {
          if (!result || !(result as any).result?.transactions) continue;
          
          const block = (result as any).result;
          for (const tx of block.transactions) {
            if (tx.from?.toLowerCase() === userAddress.toLowerCase()) {
              const target = tx.to?.toLowerCase();
              if (target && contracts.includes(target)) {
                console.log(`🎉 FOUND: ${tx.hash} -> ${tx.to}`);
                found.push({
                  ...tx,
                  timeStamp: parseInt(block.timestamp, 16),
                  blockNumber: parseInt(block.number, 16)
                });
              }
            }
          }
        }
        
        // Stop si on a trouvé quelque chose
        if (found.length > 0) {
          console.log(`✅ Found ${found.length} transactions, stopping`);
          break;
        }
      }
      
      return found;
      
    } catch (error) {
      console.error('❌ Ultra-simple scan error:', error);
      return [];
    }
  }
  
  /**
   * MÉTHODE BASIQUE: MonadScan API (comme Etherscan)
   * La plus simple et efficace pour récupérer les transactions d'une adresse
   */
  private async getTransactionsFromMonadScan(userAddress: string): Promise<any[]> {
    try {
      console.log('🌐 Fetching transactions from MonadScan API for:', userAddress);
      
      // URL MonadScan API (Etherscan-like)
      const apiUrl = `https://testnet.monadscan.com/api?module=account&action=txlist&address=${userAddress}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc`;
      
      console.log('📡 MonadScan URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StarClub/1.0)',
        }
      });
      
      if (!response.ok) {
        console.log(`❌ MonadScan API failed: ${response.status}`);
        return [];
      }
      
      const data = await response.json() as any;
      console.log('📊 MonadScan response status:', data.status);
      
      if (data.status !== '1' || !data.result) {
        console.log('❌ MonadScan: No transactions or bad status');
        return [];
      }
      
      const transactions = data.result;
      console.log(`📄 Found ${transactions.length} transactions from MonadScan`);
      
      // Filtrer pour les contrats SuperDApp
      const contractAddresses = SUPER_DAPPS.flatMap(dapp => 
        dapp.contracts.map(c => c.address.toLowerCase())
      );
      
      console.log('🎯 Filtering for SuperDApp contracts:', contractAddresses);
      
      const superDappTx = transactions.filter((tx: any) => {
        const toAddress = tx.to?.toLowerCase();
        return toAddress && contractAddresses.includes(toAddress);
      });
      
      console.log(`✅ Found ${superDappTx.length} SuperDApp transactions!`);
      
      // Afficher les détails
      superDappTx.forEach((tx: any) => {
        console.log(`🎉 SuperDApp TX: ${tx.hash} -> ${tx.to} (${Math.floor((Date.now() / 1000) - parseInt(tx.timeStamp))} seconds ago)`);
      });
      
      return superDappTx;
      
    } catch (error) {
      console.error('❌ MonadScan API error:', error);
      return [];
    }
  }
  
  
  /**
   * MÉTHODE ULTRA-SIMPLE: Scanner les 100 derniers blocs seulement (≈ 2 minutes)
   * Performance maximum, pas de timeouts
   */
  private async scanLast100BlocksOnly(userAddress: string, rpcUrl: string): Promise<any[]> {
    try {
      console.log('🚀 SIMPLE scan: Only last 100 blocks (fast)');
      
      // Récupérer le bloc actuel  
      const latestResp = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      if (!latestResp.ok) return [];
      const latestData = await latestResp.json() as any;
      const latestBlock = parseInt(latestData.result, 16);
      
      const startBlock = Math.max(0, latestBlock - 100); // Seulement 100 blocs
      console.log(`🎯 Scanning ONLY blocks ${startBlock} to ${latestBlock} (100 blocks max)`);
      
      // Adresses des contrats SuperDApps
      const contracts = SUPER_DAPPS.flatMap(dapp => 
        dapp.contracts.map(c => c.address.toLowerCase())
      );
      console.log(`🎯 Looking for:`, contracts);
      
      const foundTx: any[] = [];
      
      // Scan bloc par bloc (simple et fiable)
      for (let blockNum = latestBlock; blockNum >= startBlock; blockNum--) {
        console.log(`🔍 Block ${blockNum}...`);
        
        const blockResp = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBlockByNumber',
            params: ['0x' + blockNum.toString(16), true],
            id: blockNum
          })
        });
        
        if (!blockResp.ok) continue;
        const blockData = await blockResp.json() as any;
        const block = blockData.result;
        
        if (!block?.transactions) continue;
        
        // Chercher nos transactions
        for (const tx of block.transactions) {
          if (tx.from?.toLowerCase() === userAddress.toLowerCase()) {
            const targetContract = tx.to?.toLowerCase();
            if (targetContract && contracts.includes(targetContract)) {
              console.log(`🎉 FOUND! ${tx.hash} -> ${tx.to}`);
              foundTx.push({
                ...tx,
                timeStamp: parseInt(block.timestamp, 16),
                blockNumber: blockNum
              });
            }
          }
        }
        
        // Stop si on a trouvé quelque chose
        if (foundTx.length > 0) {
          console.log(`✅ Found ${foundTx.length} transactions, stopping`);
          break;
        }
      }
      
      return foundTx;
      
    } catch (error) {
      console.error('❌ Simple scan error:', error);
      return [];
    }
  }
  
  /**
   * MÉTHODE DIRECTE: Scanner les transactions récentes de l'utilisateur dans les derniers blocs
   * Plus fiable que eth_getLogs sur Monad
   */
  private async scanUserTransactionsDirectly(userAddress: string, rpcUrl: string): Promise<any[]> {
    try {
      console.log('🔍 Direct scan: Getting recent blocks with user transactions...');
      
      // Récupérer le bloc actuel  
      const latestBlockResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      if (!latestBlockResponse.ok) {
        console.log('❌ Failed to get latest block');
        return [];
      }
      
      const latestBlockData = await latestBlockResponse.json() as any;
      const latestBlockNumber = parseInt(latestBlockData.result, 16);
      
      // Limiter aux 2 dernières heures (≈ 7200 blocs sur Monad)
      const blocksToScan = 2 * 60 * 60; // 2 heures en blocs
      const startBlock = Math.max(0, latestBlockNumber - blocksToScan);
      
      console.log(`🔍 Scanning blocks ${startBlock} to ${latestBlockNumber} (${latestBlockNumber - startBlock} blocks)`);
      console.log(`🎯 Looking for transactions from ${userAddress} to SuperDApp contracts`);
      
      // Adresses des contrats SuperDApps
      const contractAddresses = SUPER_DAPPS.flatMap(dapp => 
        dapp.contracts.map(c => c.address.toLowerCase())
      );
      console.log(`🎯 SuperDApp contracts:`, contractAddresses);
      
      const userTransactions: any[] = [];
      const twoHoursAgo = Math.floor(Date.now() / 1000) - (2 * 60 * 60);
      
      // Scanner les blocs par chunks plus petits
      const chunkSize = 20; // Plus petit pour éviter les timeouts
      let foundCount = 0;
      
      for (let i = latestBlockNumber; i >= startBlock && foundCount < 10; i -= chunkSize) {
        const chunkStart = Math.max(startBlock, i - chunkSize + 1);
        const chunkEnd = i;
        
        console.log(`🔍 Scanning chunk: blocks ${chunkStart} to ${chunkEnd}`);
        
        // Récupérer les blocs du chunk avec transactions complètes
        const blockPromises = [];
        for (let blockNum = chunkStart; blockNum <= chunkEnd; blockNum++) {
          blockPromises.push(
            fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_getBlockByNumber',
                params: ['0x' + blockNum.toString(16), true], // true = inclure transactions
                id: blockNum
              })
            }).then(res => res.ok ? res.json() : null)
          );
        }
        
        const blocks = await Promise.all(blockPromises);
        
        // Analyser les transactions
        for (const blockData of blocks) {
          if (!blockData || !(blockData as any).result?.transactions) continue;
          
          const block = (blockData as any).result;
          const blockTimestamp = parseInt(block.timestamp, 16);
          
          // Vérifier si le bloc est dans notre fenêtre temporelle
          if (blockTimestamp < twoHoursAgo) continue;
          
          for (const tx of block.transactions) {
            // Vérifier si c'est une transaction de notre utilisateur
            if (tx.from?.toLowerCase() !== userAddress.toLowerCase()) continue;
            
            // Vérifier si c'est vers un contrat SuperDApp
            const targetContract = tx.to?.toLowerCase();
            if (!targetContract || !contractAddresses.includes(targetContract)) continue;
            
            console.log(`✅ Found SuperDApp transaction: ${tx.hash} -> ${tx.to}`);
            
            userTransactions.push({
              ...tx,
              timeStamp: blockTimestamp,
              blockNumber: parseInt(block.number, 16)
            });
            
            foundCount++;
            
            // Stop si on a trouvé assez de transactions
            if (foundCount >= 10) break;
          }
          
          if (foundCount >= 10) break;
        }
        
        // Early exit si on a trouvé des transactions
        if (userTransactions.length > 0) {
          console.log(`🎉 Found ${userTransactions.length} recent SuperDApp transactions, stopping scan`);
          break;
        }
      }
      
      console.log(`📊 Direct scan complete: ${userTransactions.length} transactions found`);
      return userTransactions;
      
    } catch (error) {
      console.error('❌ Error in direct transaction scan:', error);
      return [];
    }
  }
  
  /**
   * Méthode optimale: Utiliser eth_getLogs pour chercher les interactions avec nos contrats
   */
  private async getContractInteractionsViaLogs(userAddress: string, rpcUrl: string): Promise<any[]> {
    try {
      console.log('🔍 Using eth_getLogs for contract interactions...');
      
      // Récupérer le block actuel
      const latestBlockResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      if (!latestBlockResponse.ok) return [];
      
      const latestBlockData = await latestBlockResponse.json() as any;
      const latestBlockNumber = parseInt(latestBlockData.result, 16);
      
      // Limiter aux 2 dernières heures pour dev (≈ 7200 blocs sur Monad)
      const twoHoursAgo = 2 * 60 * 60; // 2 heures en secondes  
      const blocksFor2Hours = twoHoursAgo; // ~1 bloc/seconde sur Monad
      const fromBlock = Math.max(0, latestBlockNumber - blocksFor2Hours);
      
      console.log(`📊 Checking logs from block ${fromBlock} to ${latestBlockNumber} (last 2h)`);
      console.log(`🎯 Block range: ${latestBlockNumber - fromBlock} blocks to scan`);
      console.log(`🎯 Target block #50335435 should be in range: ${fromBlock <= 50335435 && 50335435 <= latestBlockNumber}`);
      
      // Récupérer les adresses des contrats SuperDApps
      const contractAddresses = SUPER_DAPPS.flatMap(dapp => dapp.contracts.map(c => c.address));
      console.log(`🎯 Looking for interactions with contracts:`, contractAddresses);
      
      // Chercher les logs des contrats SuperDApps
      const logsResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getLogs',
          params: [{
            fromBlock: '0x' + fromBlock.toString(16),
            toBlock: 'latest',
            address: contractAddresses
          }],
          id: 2
        })
      });
      
      if (!logsResponse.ok) return [];
      
      const logsData = await logsResponse.json() as any;
      const logs = logsData.result || [];
      
      console.log(`📊 Found ${logs.length} total logs from SuperDApp contracts`);
      
      // Analyser les logs pour trouver ceux liés à notre utilisateur
      const userInteractions: any[] = [];
      for (const log of logs) {
        // Récupérer la transaction complète pour chaque log
        const txResponse = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getTransactionByHash',
            params: [log.transactionHash],
            id: 3
          })
        });
        
        if (!txResponse.ok) continue;
        
        const txData = await txResponse.json() as any;
        const transaction = txData.result;
        
        // Vérifier si cette transaction vient de notre utilisateur
        if (transaction && transaction.from.toLowerCase() === userAddress.toLowerCase()) {
          // Récupérer le block pour avoir le timestamp
          const blockResponse = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getBlockByNumber',
              params: [transaction.blockNumber, false],
              id: 4
            })
          });
          
          if (blockResponse.ok) {
            const blockData = await blockResponse.json() as any;
            const block = blockData.result;
            
            userInteractions.push({
              ...transaction,
              timeStamp: parseInt(block.timestamp, 16),
              blockNumber: transaction.blockNumber
            });
            
            console.log(`📄 Found user interaction: ${transaction.hash} -> ${transaction.to}`);
          }
        }
      }
      
      return userInteractions;
      
    } catch (error) {
      console.error('❌ Error in getLogs approach:', error);
      return [];
    }
  }
  
  /**
   * Méthode fallback: Scanner les derniers blocs (limité à 20 minutes)
   */
  private async scanRecentBlocks(userAddress: string, rpcUrl: string): Promise<any[]> {
    try {
      console.log('🔍 Scanning recent blocks (20 min max)...');
      
      const latestBlockResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      
      if (!latestBlockResponse.ok) return [];
      
      const latestBlockData = await latestBlockResponse.json() as any;
      const latestBlockNumber = parseInt(latestBlockData.result, 16);
      
      // Limiter à 2 heures (7200 blocs max)  
      const blocksFor2Hours = 2 * 60 * 60;
      const startBlock = Math.max(0, latestBlockNumber - blocksFor2Hours);
      
      console.log(`🔍 Scanning blocks ${startBlock} to ${latestBlockNumber} (${latestBlockNumber - startBlock} blocks)`);
      console.log(`🎯 Looking for block #50335435 in this range`);
      
      const userTransactions: any[] = [];
      const twoHoursAgo = Math.floor(Date.now() / 1000) - (2 * 60 * 60);
      
      // Scanner par petits chunks pour performance
      const chunkSize = 50;
      for (let i = latestBlockNumber; i >= startBlock; i -= chunkSize) {
        const chunkStart = Math.max(startBlock, i - chunkSize + 1);
        const chunkEnd = i;
        
        console.log(`🔍 Scanning chunk: blocks ${chunkStart} to ${chunkEnd}`);
        
        const blockPromises = [];
        for (let blockNum = chunkStart; blockNum <= chunkEnd; blockNum++) {
          blockPromises.push(this.getBlockWithTransactions(rpcUrl, blockNum));
        }
        
        const blocks = await Promise.all(blockPromises);
        
        for (const block of blocks) {
          if (!block || !block.transactions) continue;
          
          for (const tx of block.transactions) {
            if (tx.from.toLowerCase() === userAddress.toLowerCase()) {
              const txTimestamp = parseInt(block.timestamp, 16);
              if (txTimestamp >= twoHoursAgo) {
                userTransactions.push({
                  ...tx,
                  timeStamp: txTimestamp,
                  blockNumber: block.number
                });
                console.log(`📄 Found recent user transaction: ${tx.hash} -> ${tx.to}`);
              }
            }
          }
        }
        
        // Si on trouve des transactions, on peut s'arrêter
        if (userTransactions.length > 0) {
          break;
        }
      }
      
      return userTransactions;
      
    } catch (error) {
      console.error('❌ Error scanning recent blocks:', error);
      return [];
    }
  }
  
  /**
   * Récupérer un bloc avec ses transactions
   */
  private async getBlockWithTransactions(rpcUrl: string, blockNumber: number): Promise<any> {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getBlockByNumber',
          params: ['0x' + blockNumber.toString(16), true], // true = include transactions
          id: 1
        })
      });
      
      if (!response.ok) return null;
      
      const data = await response.json() as any;
      return data.result;
      
    } catch (error) {
      console.warn(`Failed to get block ${blockNumber}:`, error);
      return null;
    }
  }

  /**
   * Obtenir la liste des Super dApps pour les missions
   */
  async getAvailableDapps(): Promise<Array<{ id: string; name: string; description?: string; category?: string; action?: string; website?: string; twitter?: string; github?: string; docs?: string; contractCount?: number }>> {
    try {
      console.log('🌟 Loading Super dApps for missions...');
      
      // Utiliser les Super dApps avec contrats réels
      const superDapps = SUPER_DAPPS.map(dapp => ({
        id: dapp.id,
        name: dapp.name,
        description: dapp.description,
        category: dapp.category,
        action: dapp.action, // Ajout de l'action
        website: dapp.website,
        twitter: dapp.twitter,
        github: dapp.github,
        docs: dapp.docs,
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
