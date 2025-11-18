/**
 * Script pour fetcher les protocoles depuis le repo officiel Monad
 * https://github.com/monad-crypto/protocols
 *
 * Usage:
 *   npx tsx scripts/fetch-monad-protocols.ts
 */

import axios from 'axios';
import { writeFile } from 'fs/promises';
import path from 'path';

interface MonadProtocol {
  name: string;
  description?: string;
  category?: string;
  website?: string;
  github?: string;
  twitter?: string;
  contracts?: {
    [chainId: string]: {
      [contractName: string]: string; // address
    };
  };
}

interface KnownContract {
  name: string;
  description?: string;
  logoUrl?: string;
  website?: string;
  category: string;
  tags: string[];
  confidence: number;
  source: string;
}

async function fetchMonadProtocols(): Promise<MonadProtocol[]> {
  console.log('🔍 Fetching protocols from GitHub...\n');

  try {
    // Fetcher le contenu du repo via GitHub API
    const response = await axios.get(
      'https://api.github.com/repos/monad-crypto/protocols/contents/',
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          ...(process.env.GITHUB_TOKEN && {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          }),
        },
      }
    );

    const protocols: MonadProtocol[] = [];

    // Parcourir les fichiers/dossiers
    for (const item of response.data) {
      if (item.type === 'dir') {
        // C'est un dossier de protocole
        console.log(`  📂 ${item.name}`);

        try {
          // Chercher un fichier metadata.json ou README.md
          const metadataResponse = await axios.get(
            `https://api.github.com/repos/monad-crypto/protocols/contents/${item.name}/metadata.json`,
            {
              headers: {
                Accept: 'application/vnd.github.v3+json',
                ...(process.env.GITHUB_TOKEN && {
                  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
                }),
              },
            }
          );

          // Decoder le contenu base64
          const content = Buffer.from(metadataResponse.data.content, 'base64').toString('utf-8');
          const metadata = JSON.parse(content);

          protocols.push(metadata);
          console.log(`     ✓ Loaded metadata for ${metadata.name}`);
        } catch (error) {
          console.log(`     ⚠️ No metadata.json found for ${item.name}`);
        }
      }
    }

    return protocols;
  } catch (error) {
    console.error('❌ Error fetching protocols:', error);
    return [];
  }
}

function mapCategory(category?: string): string {
  const categoryMap: Record<string, string> = {
    'dex': 'DEX',
    'lending': 'LENDING',
    'nft': 'NFT',
    'marketplace': 'NFT_MARKETPLACE',
    'gaming': 'GAMEFI',
    'social': 'SOCIAL',
    'bridge': 'BRIDGE',
    'infrastructure': 'INFRA',
    'governance': 'GOVERNANCE',
    'defi': 'DEFI',
  };

  if (!category) return 'UNKNOWN';

  const normalized = category.toLowerCase();
  return categoryMap[normalized] || 'UNKNOWN';
}

function extractTags(protocol: MonadProtocol): string[] {
  const tags: string[] = [];

  if (protocol.category) {
    tags.push(protocol.category.toLowerCase());
  }

  // Ajouter des tags basés sur le nom
  const nameLC = protocol.name.toLowerCase();
  if (nameLC.includes('swap') || nameLC.includes('dex')) tags.push('dex', 'swap');
  if (nameLC.includes('lend')) tags.push('lending');
  if (nameLC.includes('nft')) tags.push('nft');
  if (nameLC.includes('bridge')) tags.push('bridge');

  tags.push('monad', 'official');

  return [...new Set(tags)]; // Déduplication
}

async function convertToKnownContracts(protocols: MonadProtocol[]): Promise<Record<string, KnownContract>> {
  const knownContracts: Record<string, KnownContract> = {};

  for (const protocol of protocols) {
    // Extraire les contrats pour Monad testnet
    const monadContracts = protocol.contracts?.['monad-testnet'] || protocol.contracts?.['41454'];

    if (!monadContracts) {
      console.log(`  ⚠️ No Monad testnet contracts for ${protocol.name}`);
      continue;
    }

    // Ajouter chaque contrat
    for (const [contractName, address] of Object.entries(monadContracts)) {
      const normalizedAddress = address.toLowerCase();

      knownContracts[normalizedAddress] = {
        name: contractName !== 'main' ? `${protocol.name} - ${contractName}` : protocol.name,
        description: protocol.description,
        website: protocol.website,
        category: mapCategory(protocol.category),
        tags: extractTags(protocol),
        confidence: 1.0,
        source: 'manual',
      };

      console.log(`  ✓ ${knownContracts[normalizedAddress].name} (${normalizedAddress.substring(0, 10)}...)`);
    }
  }

  return knownContracts;
}

async function main() {
  console.log('🚀 Monad Protocols Fetcher\n');
  console.log('='.repeat(80));

  // 1. Fetcher les protocoles depuis GitHub
  const protocols = await fetchMonadProtocols();

  console.log(`\n✓ ${protocols.length} protocoles trouvés\n`);

  if (protocols.length === 0) {
    console.log('⚠️ Aucun protocole trouvé. Vérifier que le repo existe et est accessible.');
    console.log('   URL: https://github.com/monad-crypto/protocols');
    console.log('\n💡 Tip: Ajouter un GITHUB_TOKEN dans .env pour éviter le rate limiting');
    return;
  }

  // 2. Convertir en format known-contracts
  console.log('🔄 Conversion en format known-contracts...\n');
  const knownContracts = await convertToKnownContracts(protocols);

  console.log(`\n✓ ${Object.keys(knownContracts).length} contrats extraits\n`);

  // 3. Charger les contrats existants
  let existingContracts: Record<string, KnownContract> = {};
  const filePath = path.join(process.cwd(), 'data', 'known-contracts.json');

  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile(filePath, 'utf-8');
    existingContracts = JSON.parse(data);
    console.log(`📂 ${Object.keys(existingContracts).length} contrats existants chargés\n`);
  } catch {
    console.log('📂 Aucun fichier existant, création d\'un nouveau fichier\n');
  }

  // 4. Merger (les nouveaux écrasent les anciens)
  const mergedContracts = {
    ...existingContracts,
    ...knownContracts,
  };

  // 5. Sauvegarder
  await writeFile(filePath, JSON.stringify(mergedContracts, null, 2));

  console.log('='.repeat(80));
  console.log(`✅ ${Object.keys(mergedContracts).length} contrats sauvegardés dans ${filePath}\n`);

  // 6. Afficher un résumé par catégorie
  const byCategory: Record<string, number> = {};
  for (const contract of Object.values(mergedContracts)) {
    byCategory[contract.category] = (byCategory[contract.category] || 0) + 1;
  }

  console.log('📊 Répartition par catégorie:\n');
  for (const [category, count] of Object.entries(byCategory).sort(([, a], [, b]) => b - a)) {
    console.log(`   ${category.padEnd(20)} : ${count}`);
  }

  console.log('\n✅ Done!');
}

main();
