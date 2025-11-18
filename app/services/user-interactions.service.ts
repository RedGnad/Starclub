import { createEnvioService } from './envio.service';
import { prisma } from '~/lib/db/prisma';
import type { HyperSyncQuery } from '~/types/envio';

export interface UserInteraction {
  dappId: string;
  dappName: string | null;
  contractAddresses: string[];
  firstInteraction: Date;
  lastInteraction: Date;
  transactionCount: number;
  totalGasUsed: bigint;
  eventCount: number;
}

export interface UserInteractionSummary {
  userAddress: string;
  totalDappsInteracted: number;
  totalTransactions: number;
  interactions: UserInteraction[];
}

export interface ProgressUpdate {
  current: number;
  total: number;
  percentage: number;
  transactionsFound: number;
  estimatedSecondsRemaining: number;
}

export type ProgressCallback = (progress: ProgressUpdate) => void;

/**
 * Service pour détecter les interactions d'un utilisateur avec les dApps
 * Utilise HyperSync pour scanner rapidement l'historique on-chain
 */
export class UserInteractionsService {
  private envioService;
  private progressCallback?: ProgressCallback;

  constructor() {
    this.envioService = createEnvioService();
  }

  /**
   * Définir un callback pour recevoir les mises à jour de progression
   */
  setProgressCallback(callback: ProgressCallback) {
    this.progressCallback = callback;
  }

  /**
   * Détecte toutes les interactions d'un utilisateur avec les dApps enregistrées
   * @param userAddress - Adresse Ethereum de l'utilisateur
   * @param fromBlock - Bloc de départ (optionnel, par défaut: 0 = depuis le début)
   * @param toBlock - Bloc de fin (optionnel, par défaut: bloc actuel)
   */
  async detectUserDappInteractions(
    userAddress: string,
    fromBlock?: number,
    toBlock?: number
  ): Promise<UserInteractionSummary> {
    console.log(`🔍 Détection des interactions pour ${userAddress}...`);

    // Normaliser l'adresse
    const normalizedAddress = userAddress.toLowerCase();

    // 1. Récupérer tous les contrats des dApps depuis TOUTES les tables
    // Table DApp (ancienne)
    const dappContracts = await prisma.contract.findMany({
      where: {
        dappId: { not: null },
      },
      select: {
        address: true,
        dappId: true,
        dapp: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Table MonvisionDApp (nouvelle, avec les contrats scrapés depuis Monvision)
    const monvisionContracts = await prisma.monvisionContract.findMany({
      select: {
        address: true,
        dappId: true,
        dapp: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Combiner les deux sources de contrats
    const allContracts = [
      ...dappContracts,
      ...monvisionContracts.map(mc => ({
        address: mc.address,
        dappId: mc.dappId,
        dapp: mc.dapp,
      })),
    ];

    // Filtrer les adresses invalides (doivent commencer par 0x et avoir 42 ou 43 caractères)
    // Note: Accepte temporairement 43 chars pour debug d'adresses spéciales
    const validContracts = allContracts.filter(c => {
      const isValid = c.address &&
                     c.address.toLowerCase().startsWith('0x') &&
                     (c.address.length === 42 || c.address.length === 43) &&
                     /^0x[a-fA-F0-9]{40,41}$/.test(c.address);
      if (!isValid) {
        console.warn(`⚠️  Adresse de contrat invalide ignorée: ${c.address} (length: ${c.address?.length})`);
      }
      return isValid;
    });

    if (validContracts.length === 0) {
      console.log('⚠️ Aucun contrat de dApp trouvé dans la DB');
      return {
        userAddress: normalizedAddress,
        totalDappsInteracted: 0,
        totalTransactions: 0,
        interactions: [],
      };
    }

    console.log(`📊 ${validContracts.length} contrats valides à analyser (${dappContracts.length} DApp + ${monvisionContracts.length} Monvision)`);

    // 2. Déterminer la plage de blocs
    const currentBlock = await this.envioService.getCurrentBlock();
    const startBlock = fromBlock || 0; // Par défaut: depuis le début de la blockchain
    const endBlock = toBlock || currentBlock;

    console.log(`📦 Analyse des blocs ${startBlock} à ${endBlock}`);

    // 3. Récupérer TOUTES les transactions de l'utilisateur vers les contrats dApps
    console.log(`🔎 Récupération de toutes les activités...`);

    const [userTransactionsToDapps, userLogs, allDappLogs] = await Promise.all([
      // Transactions directes de l'utilisateur vers LES CONTRATS DAPPS SPÉCIFIQUEMENT
      this.getUserTransactionsToDapps(normalizedAddress, validContracts.map(dc => dc.address), startBlock, endBlock),
      // Logs où l'utilisateur apparaît dans les topics
      this.getUserLogs(normalizedAddress, startBlock, endBlock),
      // NOUVEAU: Tous les logs des contrats dApps dans la plage de blocs
      this.getAllDappContractLogs(validContracts.map(dc => dc.address), startBlock, endBlock),
    ]);

    console.log(`📊 ${userTransactionsToDapps.length} transactions + ${userLogs.length} logs utilisateur + ${allDappLogs.length} logs dApps`);

    // 4. Matcher les transactions ET les logs avec les contrats des dApps
    const interactionsByDapp = new Map<string, {
      dappId: string;
      dappName: string | null;
      contractAddresses: Set<string>;
      transactions: Set<string>;
      blocks: number[];
      gasUsed: bigint;
      eventCount: number;
    }>();

    // Créer un index des contrats pour une recherche rapide
    const contractIndex = new Map(
      validContracts.map((dc) => [dc.address.toLowerCase(), dc])
    );

    // Traiter les transactions directes
    for (const tx of userTransactionsToDapps) {
      const toAddress = tx.to?.toLowerCase();
      if (!toAddress) continue; // Ignore les transactions de création de contrat

      // Trouver la dApp correspondante
      const dappContract = contractIndex.get(toAddress);

      if (dappContract && dappContract.dapp) {
        const dappId = dappContract.dappId!;

        if (!interactionsByDapp.has(dappId)) {
          interactionsByDapp.set(dappId, {
            dappId,
            dappName: dappContract.dapp.name,
            contractAddresses: new Set(),
            transactions: new Set(),
            blocks: [],
            gasUsed: BigInt(0),
            eventCount: 0,
          });
        }

        const interaction = interactionsByDapp.get(dappId)!;
        interaction.contractAddresses.add(toAddress);
        if (tx.hash) {
          interaction.transactions.add(tx.hash);
        }
        if (tx.block_number) {
          interaction.blocks.push(tx.block_number);
        }
        if (tx.gas_used) {
          interaction.gasUsed += BigInt(tx.gas_used);
        }
        interaction.eventCount++;
      }
    }

    // Traiter les logs/événements (interactions indirectes)
    for (const log of userLogs) {
      const contractAddress = log.address?.toLowerCase();
      if (!contractAddress) continue;

      // Trouver la dApp correspondante
      const dappContract = contractIndex.get(contractAddress);

      if (dappContract && dappContract.dapp) {
        const dappId = dappContract.dappId!;

        if (!interactionsByDapp.has(dappId)) {
          interactionsByDapp.set(dappId, {
            dappId,
            dappName: dappContract.dapp.name,
            contractAddresses: new Set(),
            transactions: new Set(),
            blocks: [],
            gasUsed: BigInt(0),
            eventCount: 0,
          });
        }

        const interaction = interactionsByDapp.get(dappId)!;
        interaction.contractAddresses.add(contractAddress);
        if (log.transaction_hash) {
          interaction.transactions.add(log.transaction_hash);
        }
        if (log.block_number) {
          interaction.blocks.push(log.block_number);
        }
        interaction.eventCount++;
      }
    }

    // Traiter tous les logs des contrats dApps pour trouver ceux impliquant l'utilisateur
    const paddedAddress = '0x' + normalizedAddress.slice(2).padStart(64, '0');

    for (const log of allDappLogs) {
      const contractAddress = log.address?.toLowerCase();
      if (!contractAddress) continue;

      // Vérifier si l'utilisateur est impliqué dans ce log (dans les topics ou data)
      const topic1 = log.topic1?.toLowerCase();
      const topic2 = log.topic2?.toLowerCase();
      const topic3 = log.topic3?.toLowerCase();
      const data = log.data?.toLowerCase();
      const from = log.transaction?.from?.toLowerCase();

      const userInvolved =
        from === normalizedAddress ||
        topic1 === paddedAddress.toLowerCase() ||
        topic2 === paddedAddress.toLowerCase() ||
        topic3 === paddedAddress.toLowerCase() ||
        data?.includes(normalizedAddress);

      if (!userInvolved) continue;

      // Trouver la dApp correspondante
      const dappContract = contractIndex.get(contractAddress);

      if (dappContract && dappContract.dapp) {
        const dappId = dappContract.dappId!;

        if (!interactionsByDapp.has(dappId)) {
          interactionsByDapp.set(dappId, {
            dappId,
            dappName: dappContract.dapp.name,
            contractAddresses: new Set(),
            transactions: new Set(),
            blocks: [],
            gasUsed: BigInt(0),
            eventCount: 0,
          });
        }

        const interaction = interactionsByDapp.get(dappId)!;
        interaction.contractAddresses.add(contractAddress);
        if (log.transaction_hash) {
          interaction.transactions.add(log.transaction_hash);
        }
        if (log.block_number) {
          interaction.blocks.push(log.block_number);
        }
        interaction.eventCount++;
      }
    }

    console.log(`✅ ${interactionsByDapp.size} dApps détectées avec interactions`);

    // 5. Convertir en format final
    const interactions: UserInteraction[] = Array.from(interactionsByDapp.values()).map(
      (interaction) => {
        const sortedBlocks = interaction.blocks.sort((a, b) => a - b);
        const firstBlock = sortedBlocks[0];
        const lastBlock = sortedBlocks[sortedBlocks.length - 1];

        return {
          dappId: interaction.dappId,
          dappName: interaction.dappName,
          contractAddresses: Array.from(interaction.contractAddresses),
          firstInteraction: new Date(), // Approximation (on pourrait récupérer le timestamp du bloc)
          lastInteraction: new Date(),
          transactionCount: interaction.transactions.size,
          totalGasUsed: interaction.gasUsed,
          eventCount: interaction.eventCount,
        };
      }
    );

    const totalTransactions = interactions.reduce(
      (sum, i) => sum + i.transactionCount,
      0
    );

    return {
      userAddress: normalizedAddress,
      totalDappsInteracted: interactions.length,
      totalTransactions,
      interactions,
    };
  }

  /**
   * Récupère les transactions de l'utilisateur vers les contrats dApps
   * NOUVELLE APPROCHE ULTRA-OPTIMISÉE:
   * Pour chaque contrat dApp, cherche si l'utilisateur a interagi avec
   * Dès qu'on trouve UNE interaction, on passe à la dApp suivante
   * Beaucoup plus rapide que de récupérer toutes les transactions de l'utilisateur !
   */
  private async getUserTransactionsToDapps(
    userAddress: string,
    dappContractAddresses: string[],
    fromBlock: number,
    toBlock: number
  ): Promise<any[]> {
    try {
      const normalizedAddress = userAddress.toLowerCase();

      console.log(`🔎 Scan rapide par contrat dApp (${dappContractAddresses.length} contrats)...`);
      console.log(`   ⚡ Optimisation: arrêt dès la 1ère interaction trouvée par contrat`);

      const allTransactions: any[] = [];
      const txHashes = new Set<string>();
      const startTime = Date.now();
      let lastLogTime = startTime;

      // Pour chaque contrat dApp
      for (let i = 0; i < dappContractAddresses.length; i++) {
        const contractAddress = dappContractAddresses[i].toLowerCase();

        // Chercher les transactions FROM l'utilisateur TO ce contrat
        const query: HyperSyncQuery = {
          from_block: fromBlock,
          to_block: toBlock,
          transactions: [{
            from: [normalizedAddress],
            to: [contractAddress],
          }],
          field_selection: {
            transaction: [
              'from',
              'to',
              'hash',
              'block_number',
              'gas_used',
              'transaction_index',
            ],
          },
        };

        const response = await this.envioService['client'].post('/query', query);

        // Extraire les transactions (devrait en retourner max 1 avec HyperSync)
        if (Array.isArray(response.data.data) && response.data.data.length > 0) {
          const transactions = response.data.data[0].transactions || [];

          for (const tx of transactions) {
            if (!txHashes.has(tx.hash)) {
              txHashes.add(tx.hash);
              allTransactions.push(tx);
            }
          }
        }

        // Progression toutes les 5 secondes ou tous les 25 contrats
        const currentTime = Date.now();
        const elapsed = (currentTime - startTime) / 1000;
        const rate = (i + 1) / elapsed;
        const remaining = (dappContractAddresses.length - (i + 1)) / rate;
        const percentage = ((i + 1) / dappContractAddresses.length) * 100;

        if ((currentTime - lastLogTime) >= 5000 || (i + 1) % 25 === 0 || (i + 1) === dappContractAddresses.length) {
          lastLogTime = currentTime;
          console.log(
            `   ⏳ ${(i + 1)}/${dappContractAddresses.length} (${percentage.toFixed(1)}%) | ` +
            `${allTransactions.length} tx | ~${Math.ceil(remaining)}s`
          );

          // Callback de progression
          if (this.progressCallback) {
            this.progressCallback({
              current: i + 1,
              total: dappContractAddresses.length,
              percentage,
              transactionsFound: allTransactions.length,
              estimatedSecondsRemaining: Math.ceil(remaining),
            });
          }
        }
      }

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`   ✅ Scan complet en ${totalTime}s`);
      console.log(`✓ ${allTransactions.length} transactions trouvées`);

      return allTransactions;
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions utilisateur:', error);
      return [];
    }
  }

  /**
   * Récupère tous les logs de tous les contrats dApps dans une plage de blocs
   * Permet de détecter toutes les interactions, même celles dans le data field
   */
  private async getAllDappContractLogs(
    contractAddresses: string[],
    fromBlock: number,
    toBlock: number
  ): Promise<any[]> {
    try {
      console.log(`🔎 Récupération des logs de ${contractAddresses.length} contrats dApps...`);

      // Limiter à 50 contrats par requête pour éviter les timeouts
      const BATCH_SIZE = 50;
      const allLogs: any[] = [];

      for (let i = 0; i < contractAddresses.length; i += BATCH_SIZE) {
        const batch = contractAddresses.slice(i, i + BATCH_SIZE).map(a => a.toLowerCase());

        const query: HyperSyncQuery = {
          from_block: fromBlock,
          to_block: toBlock,
          logs: [
            {
              address: batch,
            },
          ],
          field_selection: {
            log: [
              'address',
              'topic0',
              'topic1',
              'topic2',
              'topic3',
              'data',
              'block_number',
              'transaction_hash',
              'log_index',
            ],
            transaction: ['from'], // Récupérer aussi le from de la transaction
          },
        };

        const response = await this.envioService['client'].post('/query', query);

        if (Array.isArray(response.data.data) && response.data.data.length > 0) {
          const logs = response.data.data[0].logs || [];
          const transactions = response.data.data[0].transactions || [];

          // Mapper les transactions par hash pour enrichir les logs
          const txMap = new Map(transactions.map((tx: any) => [tx.hash, tx]));

          // Enrichir les logs avec les infos de transaction
          for (const log of logs) {
            if (log.transaction_hash && txMap.has(log.transaction_hash)) {
              log.transaction = txMap.get(log.transaction_hash);
            }
            allLogs.push(log);
          }
        }
      }

      console.log(`✓ ${allLogs.length} logs récupérés des contrats dApps`);
      return allLogs;
    } catch (error) {
      console.error('Erreur lors de la récupération des logs des contrats dApps:', error);
      return [];
    }
  }

  /**
   * Récupère tous les logs où l'utilisateur est impliqué (via topics)
   * Dans Ethereum, l'adresse d'un utilisateur peut apparaître dans topic1, topic2 ou topic3
   */
  private async getUserLogs(
    userAddress: string,
    fromBlock: number,
    toBlock: number
  ): Promise<any[]> {
    try {
      // Formater l'adresse en topic (padded avec des zéros)
      // Les topics sont des bytes32, donc on doit padder l'adresse
      const paddedAddress = '0x' + userAddress.slice(2).padStart(64, '0');

      console.log(`🔎 Recherche des logs pour ${userAddress}...`);
      console.log(`   Topic formaté: ${paddedAddress}`);

      // Requête HyperSync pour récupérer les logs où l'utilisateur apparaît dans les topics
      // On fait 3 requêtes séparées pour topic1, topic2, topic3 (plus efficace que filtrer côté client)
      const allUserLogs: any[] = [];

      // Requête 1: topic1
      const query1: HyperSyncQuery = {
        from_block: fromBlock,
        to_block: toBlock,
        logs: [
          {
            topics: [[],[paddedAddress]], // topic0 = any, topic1 = user address
          },
        ],
        field_selection: {
          log: [
            'address',
            'topic0',
            'topic1',
            'topic2',
            'topic3',
            'data',
            'block_number',
            'transaction_hash',
            'log_index',
          ],
        },
      };

      // Requête 2: topic2
      const query2: HyperSyncQuery = {
        from_block: fromBlock,
        to_block: toBlock,
        logs: [
          {
            topics: [[],[],[paddedAddress]], // topic0 = any, topic1 = any, topic2 = user address
          },
        ],
        field_selection: {
          log: [
            'address',
            'topic0',
            'topic1',
            'topic2',
            'topic3',
            'data',
            'block_number',
            'transaction_hash',
            'log_index',
          ],
        },
      };

      // Requête 3: topic3
      const query3: HyperSyncQuery = {
        from_block: fromBlock,
        to_block: toBlock,
        logs: [
          {
            topics: [[],[],[],[paddedAddress]], // topic0 = any, topic1 = any, topic2 = any, topic3 = user address
          },
        ],
        field_selection: {
          log: [
            'address',
            'topic0',
            'topic1',
            'topic2',
            'topic3',
            'data',
            'block_number',
            'transaction_hash',
            'log_index',
          ],
        },
      };

      // Exécuter les 3 requêtes en parallèle
      const [response1, response2, response3] = await Promise.all([
        this.envioService['client'].post('/query', query1).catch(() => ({ data: { data: [] } })),
        this.envioService['client'].post('/query', query2).catch(() => ({ data: { data: [] } })),
        this.envioService['client'].post('/query', query3).catch(() => ({ data: { data: [] } })),
      ]);

      // Extraire et combiner les logs
      const extractLogs = (response: any) => {
        if (Array.isArray(response.data.data) && response.data.data.length > 0) {
          return response.data.data[0].logs || [];
        }
        return [];
      };

      allUserLogs.push(...extractLogs(response1));
      allUserLogs.push(...extractLogs(response2));
      allUserLogs.push(...extractLogs(response3));

      // Dédupliquer les logs (même log peut apparaître dans plusieurs topics)
      const uniqueLogs = new Map();
      for (const log of allUserLogs) {
        const key = `${log.transaction_hash}-${log.log_index}`;
        if (!uniqueLogs.has(key)) {
          uniqueLogs.set(key, log);
        }
      }

      const userLogs = Array.from(uniqueLogs.values());

      console.log(`✓ ${userLogs.length} logs filtrés pour cet utilisateur`);

      return userLogs;
    } catch (error) {
      console.error('Erreur lors de la récupération des logs utilisateur:', error);
      return [];
    }
  }

  /**
   * Vérifie rapidement si un utilisateur a interagi avec une dApp spécifique
   * @returns true si l'utilisateur a déjà interagi avec cette dApp
   */
  async hasUserInteractedWithDapp(
    userAddress: string,
    dappId: string,
    fromBlock?: number,
    toBlock?: number
  ): Promise<boolean> {
    const normalizedAddress = userAddress.toLowerCase();

    // Récupérer les contrats de cette dApp depuis les deux tables
    const [dappContracts, monvisionContracts] = await Promise.all([
      prisma.contract.findMany({
        where: { dappId },
        select: { address: true },
      }),
      prisma.monvisionContract.findMany({
        where: { dappId },
        select: { address: true },
      }),
    ]);

    const contracts = [...dappContracts, ...monvisionContracts];

    if (contracts.length === 0) {
      return false;
    }

    // Déterminer la plage de blocs
    const currentBlock = await this.envioService.getCurrentBlock();
    const startBlock = fromBlock || 0; // Par défaut: depuis le début de la blockchain
    const endBlock = toBlock || currentBlock;

    // Récupérer les logs de l'utilisateur
    const userLogs = await this.getUserLogs(normalizedAddress, startBlock, endBlock);

    // Vérifier si au moins un log correspond à un contrat de cette dApp
    const contractAddresses = new Set(contracts.map((c) => c.address.toLowerCase()));

    return userLogs.some((log) => {
      const contractAddress = log.address?.toLowerCase();
      return contractAddress && contractAddresses.has(contractAddress);
    });
  }

  /**
   * Récupère les IDs des dApps avec lesquelles un utilisateur a interagi
   * Version optimisée qui retourne uniquement les IDs (pour l'UI)
   */
  async getUserInteractedDappIds(
    userAddress: string,
    fromBlock?: number,
    toBlock?: number
  ): Promise<string[]> {
    const summary = await this.detectUserDappInteractions(
      userAddress,
      fromBlock,
      toBlock
    );

    return summary.interactions.map((i) => i.dappId);
  }
}

// Factory function
export function createUserInteractionsService(): UserInteractionsService {
  return new UserInteractionsService();
}
