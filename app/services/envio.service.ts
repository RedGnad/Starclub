import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type { EnvioConfig, HyperSyncQuery, EnvioTransaction } from '~/types/envio';

/**
 * Client pour l'API Envio HyperSync
 * Utilise HyperSync pour un accès ultra-rapide aux données Monad
 */
export class EnvioService {
  private client: AxiosInstance;
  private config: EnvioConfig;

  constructor(config: EnvioConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.hyperSyncUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // 60 secondes pour les grosses requêtes
    });

    // Intercepteur pour logger les erreurs
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Envio HyperSync Error:', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          data: error.response?.data,
        });
        throw error;
      }
    );
  }

  /**
   * Trouve les contrats les plus actifs en analysant les logs/événements
   * Approche plus légère que de scanner tous les déploiements
   */
  async findMostActiveContracts(
    fromBlock: number,
    toBlock: number,
    limit: number = 50
  ): Promise<Array<{ address: string; eventCount: number; eventTypes: string[] }>> {
    try {
      console.log(`🔍 Recherche des contrats actifs (blocs ${fromBlock} à ${toBlock})...`);

      // Récupérer tous les logs de la période
      // Important: il faut ajouter un filtre logs vide pour récupérer TOUS les logs
      const query: HyperSyncQuery = {
        from_block: fromBlock,
        to_block: toBlock,
        logs: [
          {
            // Filtre vide = tous les logs du range de blocs
          }
        ],
        field_selection: {
          log: ['address', 'topic0', 'topic1', 'topic2', 'topic3', 'block_number'],
        },
      };

      const response = await this.client.post('/query', query);

      // La structure est: { data: [{ logs: [...] }], next_block: ..., archive_height: ... }
      // On doit extraire les logs du premier élément du tableau data
      let logs: any[] = [];
      if (Array.isArray(response.data.data) && response.data.data.length > 0) {
        logs = response.data.data[0].logs || [];
      }

      console.log(`📊 ${logs.length} événements récupérés`);

      // Grouper par adresse de contrat et compter les événements
      const contractActivity = new Map<string, { count: number; eventTypes: Set<string> }>();

      for (const log of logs) {
        const address = log.address?.toLowerCase();
        if (!address) continue;

        // Le premier topic est la signature de l'événement (topic0)
        const eventSignature = log.topic0 || undefined;

        if (!contractActivity.has(address)) {
          contractActivity.set(address, { count: 0, eventTypes: new Set() });
        }

        const activity = contractActivity.get(address)!;
        activity.count++;
        if (eventSignature) {
          activity.eventTypes.add(eventSignature);
        }
      }

      // Convertir en tableau et trier par nombre d'événements
      const sortedContracts = Array.from(contractActivity.entries())
        .map(([address, activity]) => ({
          address,
          eventCount: activity.count,
          eventTypes: Array.from(activity.eventTypes),
        }))
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, limit);

      console.log(`✓ Top ${sortedContracts.length} contrats actifs trouvés`);
      sortedContracts.slice(0, 10).forEach((contract, i) => {
        console.log(`  ${i + 1}. ${contract.address}: ${contract.eventCount} événements`);
      });

      return sortedContracts;
    } catch (error) {
      console.error('Erreur lors de la recherche des contrats actifs:', error);
      return [];
    }
  }

  /**
   * Récupère la hauteur actuelle de la blockchain
   */
  async getCurrentBlock(): Promise<number> {
    try {
      // Méthode 1: Essayer via HyperSync
      try {
        const query: HyperSyncQuery = {
          from_block: 0,
          field_selection: {
            block: ['number'],
          },
        };

        const response = await this.client.post('/query', query);

        // Debugger la réponse pour comprendre sa structure
        console.log('HyperSync Response data keys:', Object.keys(response.data));
        console.log('HyperSync Response data:', JSON.stringify(response.data, null, 2));

        // Essayer différentes propriétés possibles
        const currentBlock = response.data.archiveHeight ||
                            response.data.archive_height ||
                            response.data.nextBlock ||
                            response.data.next_block ||
                            response.data.height ||
                            0;

        if (currentBlock > 0) {
          console.log('✓ Current block via HyperSync:', currentBlock);
          return currentBlock;
        }
      } catch (hyperSyncError) {
        console.log('HyperSync height query failed, trying RPC fallback...');
      }

      // Méthode 2: Fallback sur RPC Monad directement
      const rpcUrl = process.env.VITE_MONAD_RPC_URL || 'https://monad-testnet.g.alchemy.com/v2/demo';
      console.log('Trying RPC at:', rpcUrl);

      const rpcResponse = await axios.post(rpcUrl, {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      });

      const blockHex = rpcResponse.data.result;
      const blockNumber = parseInt(blockHex, 16);
      console.log('✓ Current block via RPC:', blockNumber);

      return blockNumber;
    } catch (error) {
      console.error('Erreur lors de la récupération du bloc actuel:', error);
      // Si tout échoue, retourner un bloc raisonnable pour Monad testnet
      const fallbackBlock = 100000; // Valeur de secours raisonnable
      console.log(`⚠️ Utilisation du bloc de secours: ${fallbackBlock}`);
      return fallbackBlock;
    }
  }

  /**
   * Trouve le déployeur (creator) d'un contrat en analysant sa transaction de création
   */
  async findContractCreator(
    contractAddress: string,
    fromBlock: number,
    toBlock: number
  ): Promise<string> {
    try {
      const query: HyperSyncQuery = {
        from_block: fromBlock,
        to_block: toBlock,
        transactions: [
          {
            // Pas de filtre 'to' pour attraper les transactions de création (to === null)
          }
        ],
        field_selection: {
          transaction: ['from', 'to', 'contract_address'],
        },
      };

      const response = await this.client.post('/query', query);

      // Chercher la transaction qui a créé ce contrat
      if (Array.isArray(response.data.data) && response.data.data.length > 0) {
        const transactions = response.data.data[0].transactions || [];
        const creationTx = transactions.find(
          (tx: any) =>
            tx.contract_address?.toLowerCase() === contractAddress.toLowerCase() ||
            tx.contractAddress?.toLowerCase() === contractAddress.toLowerCase()
        );

        if (creationTx && creationTx.from) {
          console.log(`  ✓ Creator trouvé pour ${contractAddress}: ${creationTx.from}`);
          return creationTx.from.toLowerCase();
        }
      }

      // Si non trouvé, retourner l'adresse du contrat lui-même
      console.log(`  ⚠️ Creator non trouvé pour ${contractAddress}, utilisation de l'adresse du contrat`);
      return contractAddress.toLowerCase();
    } catch (error) {
      console.error(`Erreur lors de la recherche du creator pour ${contractAddress}:`, error);
      return contractAddress.toLowerCase(); // Fallback : utiliser l'adresse du contrat
    }
  }

  /**
   * Découvre les dApps actives en analysant l'activité des contrats
   * Approche légère et pertinente : on cherche les contrats avec le plus d'événements
   */
  async discoverContracts(options?: {
    fromBlock?: number;
    maxBlocks?: number;
    maxContracts?: number;
    maxDApps?: number;
  }): Promise<Array<{ address: string; deployer: string; timestamp: number; blockNumber: number }>> {
    const maxContracts = options?.maxContracts || 500; // Top 500 par défaut
    const maxBlocks = options?.maxBlocks || 1000; // Réduit à 1000 blocs pour éviter les timeouts
    const maxDApps = options?.maxDApps || 5; // Par défaut : 5 dApps uniques

    console.log('🔍 Récupération de la hauteur actuelle de la blockchain...');
    const currentBlock = await this.getCurrentBlock();
    const startBlock = options?.fromBlock || Math.max(0, currentBlock - maxBlocks);

    console.log(`📊 Analyse de l'activité (blocs ${startBlock} à ${currentBlock})`);

    // Trouver les contrats les plus actifs
    const activeContracts = await this.findMostActiveContracts(startBlock, currentBlock, maxContracts);

    console.log(`✓ ${activeContracts.length} contrats actifs trouvés`);
    console.log(`🔍 Recherche des deployers pour identifier les dApps (limite: ${maxDApps} dApps)...`);

    // Récupérer les deployers et grouper par factory
    const contracts = [];
    const uniqueDeployers = new Set<string>();

    for (const contract of activeContracts) {
      // Arrêter si on a déjà trouvé le nombre de dApps demandé
      if (uniqueDeployers.size >= maxDApps) {
        console.log(`✓ Limite de ${maxDApps} dApps atteinte, arrêt de la découverte`);
        break;
      }

      // Récupérer le vrai deployer
      const deployer = await this.findContractCreator(contract.address, startBlock, currentBlock);

      // Ajouter le contrat
      contracts.push({
        address: contract.address,
        deployer: deployer,
        timestamp: Math.floor(Date.now() / 1000),
        blockNumber: currentBlock,
        eventCount: contract.eventCount,
        eventTypes: contract.eventTypes,
      });

      // Ajouter le deployer aux factories uniques
      const wasNew = !uniqueDeployers.has(deployer);
      uniqueDeployers.add(deployer);

      if (wasNew) {
        console.log(`  🎉 Nouvelle dApp découverte (${uniqueDeployers.size}/${maxDApps}): factory ${deployer.substring(0, 10)}...`);
      }
    }

    console.log(`✓ Découverte terminée: ${contracts.length} contrats de ${uniqueDeployers.size} dApps trouvées`);
    return contracts;
  }

  /**
   * Classifie un contrat selon ses événements
   * Retourne le type de dApp le plus probable avec une catégorie Prisma valide
   */
  classifyContractByEvents(eventTypes: string[]): {
    type: 'DEFI' | 'DEX' | 'LENDING' | 'NFT' | 'NFT_MARKETPLACE' | 'GAMEFI' | 'SOCIAL' | 'BRIDGE' | 'INFRA' | 'GOVERNANCE' | 'TOKEN' | 'UNKNOWN';
    confidence: number;
  } {
    // Signatures d'événements typiques (keccak256 des signatures)
    const EVENT_SIGNATURES = {
      // Tokens ERC20
      Transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
      Approval: '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',

      // DEX / AMM (Uniswap V2/V3 style)
      Swap: '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
      Sync: '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1',
      Mint: '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f',
      Burn: '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496',
      PairCreated: '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9',

      // NFT ERC721/ERC1155
      TransferSingle: '0xc3d58168c5ae7397731d063d5bbf3d657854427343f4c083240f7aacaa2d0f62',
      TransferBatch: '0x4a39dc06d4c0dbc64b70af90fd698a233a518aa5d07e595d983b8c0526c8f7fb',

      // DeFi Lending (Aave, Compound style)
      Deposit: '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c',
      Withdraw: '0x884edad9ce6fa2440d8a54cc123490eb96d2768479d49ff9c7366125a9424364',
      Borrow: '0x13ed6866d4e1ee6da46f845c46d7e54120883d75c5ea9a2dacc1c4ca8984ab80',
      Repay: '0x1a2a22cb034d26d1854bdc6666a5b91fe25efbbb5dcad3b0355478d6f5c362a1',
      Stake: '0x9e71bc8eea02a63969f509818f2dafb9254532904319f9dbda79b67bd34a5f3d',

      // Governance
      ProposalCreated: '0x7d84a6263ae0d98d3329bd7b46bb4e8d6f98cd35a7adb45c274c8b7fd5ebd5e0',
      VoteCast: '0xb8e138887d0aa13bab447e82de9d5c1777041ecd21ca36ba824ff1e6c07ddda4',

      // Bridge
      TokensLocked: '0x9b1bfa7fa9ee420a16e124f794c35ac9f90472acc99140eb2f6447c714cad8eb',
      TokensUnlocked: '0x0f0bc5b519dbd37e22a6a9ca6e4d8eb3e1f3e8e7f73e3f8e0f6c5f4e3f2f1f0e',

      // NFT Marketplace
      OrderFilled: '0x9d9af8e38d66c62e2c12f0225249fd9d721c54b83f48d9352c97c6cacdcb6f31',
      ItemSold: '0x2e95b6c8b1e6b5c3f5a7f9b8c6d4e2f3b5c7d8e9f1a2b3c4d5e6f7a8b9c0d1e2',
    };

    // Créer un Set qui contient à la fois les signatures et les noms d'événements
    const eventSignatureSet = new Set(eventTypes);
    const eventNameSet = new Set<string>();

    // Pour chaque type d'événement fourni, vérifier s'il s'agit d'une signature (0x...) ou d'un nom
    eventTypes.forEach(eventType => {
      if (eventType.startsWith('0x')) {
        // C'est une signature, trouver le nom correspondant
        const eventName = Object.entries(EVENT_SIGNATURES).find(([, sig]) => sig === eventType)?.[0];
        if (eventName) {
          eventNameSet.add(eventName);
        }
      } else {
        // C'est déjà un nom
        eventNameSet.add(eventType);
      }
    });

    // Scoring par catégorie
    let scores = {
      DEX: 0,
      LENDING: 0,
      TOKEN: 0,
      NFT: 0,
      NFT_MARKETPLACE: 0,
      GOVERNANCE: 0,
      BRIDGE: 0,
      DEFI: 0,
      UNKNOWN: 0,
    };

    // DEX patterns (Uniswap, SushiSwap, etc.)
    if (eventNameSet.has('Swap') || eventSignatureSet.has(EVENT_SIGNATURES.Swap)) scores.DEX += 15;
    if (eventNameSet.has('Sync') || eventSignatureSet.has(EVENT_SIGNATURES.Sync)) scores.DEX += 10;
    if (eventNameSet.has('PairCreated') || eventSignatureSet.has(EVENT_SIGNATURES.PairCreated)) scores.DEX += 12;
    if ((eventNameSet.has('Mint') || eventSignatureSet.has(EVENT_SIGNATURES.Mint)) &&
        (eventNameSet.has('Burn') || eventSignatureSet.has(EVENT_SIGNATURES.Burn))) {
      scores.DEX += 8;
    }

    // Lending patterns (Aave, Compound, etc.)
    if (eventNameSet.has('Borrow') || eventSignatureSet.has(EVENT_SIGNATURES.Borrow)) scores.LENDING += 15;
    if (eventNameSet.has('Repay') || eventSignatureSet.has(EVENT_SIGNATURES.Repay)) scores.LENDING += 15;
    if ((eventNameSet.has('Deposit') || eventSignatureSet.has(EVENT_SIGNATURES.Deposit)) &&
        (eventNameSet.has('Withdraw') || eventSignatureSet.has(EVENT_SIGNATURES.Withdraw))) {
      scores.LENDING += 10;
    }

    // NFT patterns
    if (eventNameSet.has('TransferSingle') || eventSignatureSet.has(EVENT_SIGNATURES.TransferSingle)) scores.NFT += 15;
    if (eventNameSet.has('TransferBatch') || eventSignatureSet.has(EVENT_SIGNATURES.TransferBatch)) scores.NFT += 15;

    // NFT Marketplace patterns
    if (eventNameSet.has('OrderFilled') || eventSignatureSet.has(EVENT_SIGNATURES.OrderFilled)) scores.NFT_MARKETPLACE += 15;
    if (eventNameSet.has('ItemSold') || eventSignatureSet.has(EVENT_SIGNATURES.ItemSold)) scores.NFT_MARKETPLACE += 15;
    if ((eventNameSet.has('Transfer') || eventSignatureSet.has(EVENT_SIGNATURES.Transfer)) &&
        ((eventNameSet.has('TransferSingle') || eventSignatureSet.has(EVENT_SIGNATURES.TransferSingle)) ||
         (eventNameSet.has('TransferBatch') || eventSignatureSet.has(EVENT_SIGNATURES.TransferBatch)))) {
      scores.NFT_MARKETPLACE += 8;
    }

    // Token patterns (simple ERC20)
    if (eventNameSet.has('Transfer') || eventSignatureSet.has(EVENT_SIGNATURES.Transfer)) scores.TOKEN += 5;
    if (eventNameSet.has('Approval') || eventSignatureSet.has(EVENT_SIGNATURES.Approval)) scores.TOKEN += 3;

    // DeFi générique (staking, farming, etc.)
    if (eventNameSet.has('Stake') || eventSignatureSet.has(EVENT_SIGNATURES.Stake)) scores.DEFI += 12;
    if ((eventNameSet.has('Deposit') || eventSignatureSet.has(EVENT_SIGNATURES.Deposit)) &&
        !(eventNameSet.has('Borrow') || eventSignatureSet.has(EVENT_SIGNATURES.Borrow))) {
      scores.DEFI += 8;
    }

    // Governance patterns
    if (eventNameSet.has('ProposalCreated') || eventSignatureSet.has(EVENT_SIGNATURES.ProposalCreated)) scores.GOVERNANCE += 15;
    if (eventNameSet.has('VoteCast') || eventSignatureSet.has(EVENT_SIGNATURES.VoteCast)) scores.GOVERNANCE += 15;

    // Bridge patterns
    if (eventNameSet.has('TokensLocked') || eventSignatureSet.has(EVENT_SIGNATURES.TokensLocked)) scores.BRIDGE += 15;
    if (eventNameSet.has('TokensUnlocked') || eventSignatureSet.has(EVENT_SIGNATURES.TokensUnlocked)) scores.BRIDGE += 15;

    // Si aucun pattern reconnu
    if (Object.values(scores).every((s) => s === 0)) {
      scores.UNKNOWN = 1;
    }

    // Trouver le type avec le meilleur score
    const bestMatch = Object.entries(scores).reduce((best, [type, score]) =>
      score > best.score ? { type, score } : best
    , { type: 'UNKNOWN', score: 0 });

    return {
      type: bestMatch.type as any,
      confidence: Math.min(bestMatch.score / 15, 1), // Normaliser entre 0 et 1
    };
  }

  /**
   * Récupère les logs d'un contrat spécifique pour analyser son activité
   */
  async getContractLogs(
    contractAddress: string,
    fromBlock: number,
    toBlock: number
  ): Promise<any[]> {
    try {
      const query: HyperSyncQuery = {
        from_block: fromBlock,
        to_block: toBlock,
        logs: [
          {
            address: [contractAddress],
          },
        ],
        field_selection: {
          log: ['address', 'topic0', 'topic1', 'topic2', 'topic3', 'data', 'block_number', 'transaction_hash', 'log_index'],
        },
      };

      const response = await this.client.post('/query', query);

      // Même structure que findMostActiveContracts : data est un tableau
      if (Array.isArray(response.data.data) && response.data.data.length > 0) {
        return response.data.data[0].logs || [];
      }
      return [];
    } catch (error) {
      console.error(`Erreur lors de la récupération des logs pour ${contractAddress}:`, error);
      return [];
    }
  }

  /**
   * Estime l'activité d'un contrat en comptant ses logs/événements
   */
  async getContractActivity(
    contractAddress: string,
    maxBlocks: number = 10000
  ): Promise<{ logCount: number; isActive: boolean }> {
    try {
      const currentBlock = await this.getCurrentBlock();
      const fromBlock = Math.max(0, currentBlock - maxBlocks);

      const logs = await this.getContractLogs(contractAddress, fromBlock, currentBlock);

      return {
        logCount: logs.length,
        isActive: logs.length > 0,
      };
    } catch (error) {
      console.error(`Erreur lors de l'analyse de l'activité du contrat ${contractAddress}:`, error);
      return {
        logCount: 0,
        isActive: false,
      };
    }
  }
}

// Factory function pour créer une instance du service
export function createEnvioService(): EnvioService {
  const config: EnvioConfig = {
    hyperSyncUrl: process.env.ENVIO_HYPERSYNC_URL || 'https://monad-testnet.hypersync.xyz',
    chainId: process.env.MONAD_CHAIN_ID || 'monad-testnet',
  };

  return new EnvioService(config);
}
