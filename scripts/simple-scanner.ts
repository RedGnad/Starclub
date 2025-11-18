/**
 * Script standalone de scan de blockchain
 * Utilise viem pour scanner Monad testnet et détecter les smart contracts
 *
 * Usage:
 *   npx tsx scripts/simple-scanner.ts
 */

import { createPublicClient, http, parseAbiItem } from 'viem';
import { defineChain } from 'viem';

// Définir Monad testnet
const monadTestnet = defineChain({
  id: 41454,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Monad',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://monad-testnet.g.alchemy.com/v2/Tct1vx71u-M7UrCa_56_T_cuFdPaLV06'],
    },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://testnet.monadexplorer.com' },
  },
  testnet: true,
});

// Créer le client
const client = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

interface DiscoveredContract {
  address: string;
  deployer: string;
  blockNumber: bigint;
  type: 'ERC20' | 'ERC721' | 'ERC1155' | 'CUSTOM' | 'UNKNOWN';
  name?: string;
  symbol?: string;
  transactionCount: number;
}

/**
 * Scan un range de blocs pour trouver les créations de contrats
 */
async function scanBlockRange(
  fromBlock: bigint,
  toBlock: bigint
): Promise<DiscoveredContract[]> {
  const contracts: DiscoveredContract[] = [];

  console.log(`\n🔍 Scan des blocs ${fromBlock} à ${toBlock}...`);

  // Dans Ethereum/EVM, les créations de contrats sont des transactions sans 'to' address
  // Mais on va plutôt analyser les événements pour trouver les contrats actifs

  try {
    // Méthode 1 : Chercher les événements Transfer (ERC20/721)
    // C'est plus efficace que de scanner toutes les transactions
    console.log('📊 Recherche des contrats ERC20/721 via événements Transfer...');

    const transferLogs = await client.getLogs({
      // Event Transfer(address indexed from, address indexed to, uint256 value/tokenId)
      event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
      fromBlock,
      toBlock,
    });

    console.log(`   Trouvé ${transferLogs.length} événements Transfer`);

    // Grouper par adresse de contrat
    const contractAddresses = new Map<string, { count: number; blockNumber: bigint }>();

    for (const log of transferLogs) {
      const address = log.address.toLowerCase();
      if (!contractAddresses.has(address)) {
        contractAddresses.set(address, {
          count: 0,
          blockNumber: log.blockNumber || 0n,
        });
      }
      contractAddresses.get(address)!.count++;
    }

    // Analyser chaque contrat unique
    console.log(`\n✓ ${contractAddresses.size} contrats uniques trouvés`);
    console.log('🔍 Récupération des métadonnées...\n');

    let processed = 0;
    for (const [address, info] of contractAddresses.entries()) {
      processed++;

      // Afficher la progression
      if (processed % 10 === 0 || processed === contractAddresses.size) {
        console.log(`   Progression: ${processed}/${contractAddresses.size}`);
      }

      try {
        const contractInfo = await analyzeContract(address as `0x${string}`, info.blockNumber);

        if (contractInfo) {
          contracts.push({
            ...contractInfo,
            transactionCount: info.count,
          });
        }
      } catch (error) {
        // Ignorer les erreurs individuelles
        console.error(`   ❌ Erreur pour ${address}:`, (error as Error).message);
      }
    }

    return contracts;
  } catch (error) {
    console.error('❌ Erreur lors du scan:', error);
    return contracts;
  }
}

/**
 * Analyse un contrat pour déterminer son type et ses métadonnées
 */
async function analyzeContract(
  address: `0x${string}`,
  blockNumber: bigint
): Promise<Omit<DiscoveredContract, 'transactionCount'> | null> {
  try {
    // Récupérer le bytecode pour vérifier que c'est bien un contrat
    const code = await client.getCode({ address });

    if (!code || code === '0x') {
      return null; // Pas un contrat
    }

    // Essayer de récupérer le deployer via transaction de création
    // Note : Cela nécessiterait de retrouver la transaction de création
    // Pour simplifier, on va juste mettre une adresse par défaut
    const deployer = '0x0000000000000000000000000000000000000000';

    // Détecter le type de contrat
    const contractType = await detectContractType(address);

    // Récupérer les métadonnées si c'est un token
    let name: string | undefined;
    let symbol: string | undefined;

    if (contractType === 'ERC20' || contractType === 'ERC721') {
      try {
        name = await client.readContract({
          address,
          abi: [parseAbiItem('function name() view returns (string)')],
          functionName: 'name',
        }) as string;
      } catch {
        // Ignorer si name() n'existe pas
      }

      try {
        symbol = await client.readContract({
          address,
          abi: [parseAbiItem('function symbol() view returns (string)')],
          functionName: 'symbol',
        }) as string;
      } catch {
        // Ignorer si symbol() n'existe pas
      }
    }

    return {
      address,
      deployer,
      blockNumber,
      type: contractType,
      name,
      symbol,
    };
  } catch (error) {
    console.error(`Erreur lors de l'analyse de ${address}:`, error);
    return null;
  }
}

/**
 * Détecte le type d'un contrat (ERC20, ERC721, etc.)
 */
async function detectContractType(
  address: `0x${string}`
): Promise<'ERC20' | 'ERC721' | 'ERC1155' | 'CUSTOM' | 'UNKNOWN'> {
  try {
    // Vérifier ERC20 (via totalSupply + decimals)
    try {
      await client.readContract({
        address,
        abi: [parseAbiItem('function decimals() view returns (uint8)')],
        functionName: 'decimals',
      });

      // Si decimals() existe, c'est probablement un ERC20
      return 'ERC20';
    } catch {
      // Pas un ERC20
    }

    // Vérifier ERC721 (via supportsInterface)
    try {
      const supportsERC721 = await client.readContract({
        address,
        abi: [parseAbiItem('function supportsInterface(bytes4) view returns (bool)')],
        functionName: 'supportsInterface',
        args: ['0x80ac58cd'], // ERC721 interface ID
      });

      if (supportsERC721) {
        return 'ERC721';
      }
    } catch {
      // Pas un ERC721
    }

    // Vérifier ERC1155
    try {
      const supportsERC1155 = await client.readContract({
        address,
        abi: [parseAbiItem('function supportsInterface(bytes4) view returns (bool)')],
        functionName: 'supportsInterface',
        args: ['0xd9b67a26'], // ERC1155 interface ID
      });

      if (supportsERC1155) {
        return 'ERC1155';
      }
    } catch {
      // Pas un ERC1155
    }

    // Si on a du code mais aucun standard reconnu
    return 'CUSTOM';
  } catch {
    return 'UNKNOWN';
  }
}

/**
 * Affiche les résultats du scan
 */
function displayResults(contracts: DiscoveredContract[]) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 RÉSULTATS DU SCAN');
  console.log('='.repeat(80));

  console.log(`\nTotal de contrats trouvés : ${contracts.length}\n`);

  // Grouper par type
  const byType = new Map<string, DiscoveredContract[]>();
  for (const contract of contracts) {
    if (!byType.has(contract.type)) {
      byType.set(contract.type, []);
    }
    byType.get(contract.type)!.push(contract);
  }

  // Afficher les statistiques
  console.log('📈 Répartition par type :');
  for (const [type, list] of byType.entries()) {
    console.log(`   ${type.padEnd(10)} : ${list.length} contrats`);
  }

  // Afficher les top 10 contrats les plus actifs
  console.log('\n🔥 Top 10 des contrats les plus actifs :\n');

  const sorted = [...contracts].sort((a, b) => b.transactionCount - a.transactionCount);

  for (let i = 0; i < Math.min(10, sorted.length); i++) {
    const contract = sorted[i];
    const displayName = contract.name || contract.symbol || 'Unknown';

    console.log(`${(i + 1).toString().padStart(2)}. ${displayName.padEnd(30)} (${contract.type})`);
    console.log(`    Address: ${contract.address}`);
    console.log(`    Transactions: ${contract.transactionCount}`);
    console.log('');
  }

  console.log('='.repeat(80));
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Sherlock - Monad Testnet Contract Scanner');
  console.log('='.repeat(80));

  try {
    // Récupérer le bloc actuel
    const currentBlock = await client.getBlockNumber();
    console.log(`\n📍 Bloc actuel : ${currentBlock}`);

    // Scanner les 1000 derniers blocs (ajustable)
    const BLOCK_RANGE = 1000n;
    const fromBlock = currentBlock - BLOCK_RANGE;
    const toBlock = currentBlock;

    // Lancer le scan
    const contracts = await scanBlockRange(fromBlock, toBlock);

    // Afficher les résultats
    displayResults(contracts);

    // Optionnel : Sauvegarder dans un fichier JSON
    const fs = await import('fs/promises');
    await fs.writeFile(
      'discovered-contracts.json',
      JSON.stringify(contracts, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value
      , 2)
    );

    console.log('\n💾 Résultats sauvegardés dans discovered-contracts.json');

  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Lancer le script
main();
