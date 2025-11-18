/**
 * Service d'enrichissement des protocoles Monad
 * Combine les données du repo officiel avec les stats d'activité Envio
 */

import axios from 'axios';
import { prisma } from '~/lib/db/prisma';
import { protocolCacheService } from './protocol-cache.service';
import { googleSheetsService, type GoogleSheetsProtocol } from './google-sheets.service';

interface MonadProtocol {
  name: string;
  description?: string;
  category?: string;
  website?: string;
  github?: string;
  twitter?: string;
  logo?: string;
  banner?: string;
  contracts?: {
    [contractName: string]: string; // address
  };
}

interface EnvioContractStats {
  address: string;
  txCount: number;
  eventCount: number;
  uniqueUsers: number;
  firstSeen: number;
  lastSeen: number;
  events: string[]; // Types d'événements
}

interface EnrichedProtocol {
  name: string;
  description?: string;
  category?: string;
  website?: string;
  github?: string;
  twitter?: string;
  logo?: string;
  banner?: string;
  stats: {
    totalTxCount: number;
    totalEventCount: number;
    uniqueUsers: number;
    contractCount: number;
    firstActivity: Date | null;
    lastActivity: Date | null;
    activityScore: number; // 0-10
  };
  contracts: {
    [contractName: string]: {
      address: string;
      stats: EnvioContractStats | null;
    };
  };
}

export class ProtocolEnrichmentService {
  private envioUrl: string;
  private googleSheetsCache: GoogleSheetsProtocol[] | null = null;

  constructor() {
    this.envioUrl = process.env.ENVIO_HYPERSYNC_URL || 'https://monad-testnet.hypersync.xyz';
  }

  /**
   * Récupérer les données Google Sheets en cache (charge une seule fois)
   */
  private async getGoogleSheetsData(): Promise<GoogleSheetsProtocol[]> {
    if (this.googleSheetsCache === null) {
      this.googleSheetsCache = await googleSheetsService.fetchProtocols();
    }
    return this.googleSheetsCache;
  }

  /**
   * 1. RÉCUPÉRER LES PROTOCOLES DEPUIS LE CSV GITHUB MONAD
   * Format: protocols-testnet.csv ou protocols-mainnet.csv
   * AVEC CACHE (24h)
   */
  async fetchMonadProtocols(network: 'testnet' | 'mainnet' = 'testnet', forceRefresh: boolean = false): Promise<MonadProtocol[]> {
    const cacheKey = `github_protocols_${network}`;

    // Vérifier le cache si pas de rafraîchissement forcé
    if (!forceRefresh) {
      const cached = await protocolCacheService.get<MonadProtocol[]>(cacheKey);
      if (cached) {
        console.log(`📦 Utilisation du cache pour les protocoles ${network} (${cached.length} protocoles)\n`);
        return cached;
      }
    }

    console.log(`📥 Récupération des protocoles depuis GitHub CSV (${network})...\n`);

    try {
      // Récupérer le CSV depuis GitHub
      const csvUrl = `https://raw.githubusercontent.com/monad-crypto/protocols/main/protocols-${network}.csv`;
      const response = await axios.get(csvUrl, {
        headers: {
          Accept: 'text/csv',
          ...(process.env.GITHUB_TOKEN && {
            Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          }),
        },
      });

      // Parser le CSV avec papaparse
      const Papa = (await import('papaparse')).default;
      const parsed = Papa.parse<string[]>(response.data, {
        header: false,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        console.error('⚠️ Erreurs lors du parsing CSV:', parsed.errors);
      }

      const rows = parsed.data;
      if (rows.length === 0) {
        console.log('⚠️ Aucune donnée trouvée dans le CSV GitHub');
        return [];
      }

      // La première ligne contient les en-têtes
      const headers = rows[0];
      const dataRows = rows.slice(1);

      console.log(`📊 ${dataRows.length} lignes trouvées dans le CSV GitHub`);

      // Trouver les indices des colonnes importantes
      const nameIdx = headers.findIndex(h => h.toLowerCase() === 'name');
      const ctypeIdx = headers.findIndex(h => h.toLowerCase() === 'ctype');
      const contractIdx = headers.findIndex(h => h.toLowerCase() === 'contract');
      const addressIdx = headers.findIndex(h => h.toLowerCase() === 'address');

      // Grouper les lignes par nom de protocole (car chaque ligne = 1 contrat)
      const protocolsMap = new Map<string, MonadProtocol>();

      for (const row of dataRows) {
        const name = row[nameIdx]?.trim();
        if (!name) continue;

        const contractName = row[contractIdx]?.trim() || 'main';
        const contractAddress = row[addressIdx]?.trim();
        if (!contractAddress || !contractAddress.startsWith('0x')) continue;

        // Récupérer ou créer le protocole
        if (!protocolsMap.has(name)) {
          protocolsMap.set(name, {
            name,
            category: row[ctypeIdx]?.trim(),
            contracts: {},
          });
        }

        const protocol = protocolsMap.get(name)!;
        protocol.contracts![contractName] = contractAddress.toLowerCase();
      }

      const protocols = Array.from(protocolsMap.values());
      console.log(`✓ ${protocols.length} protocoles uniques avec ${dataRows.length} contrats au total\n`);

      // Sauvegarder dans le cache (24h = 86400 secondes)
      await protocolCacheService.set(cacheKey, protocols, 86400);

      return protocols;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des protocoles:', error);
      return [];
    }
  }

  /**
   * 2. OBTENIR LES STATS D'UN CONTRAT VIA ENVIO
   * Récupère directement les transactions liées au contrat (to ou from)
   */
  async getContractStats(address: string, fromBlock?: number): Promise<EnvioContractStats | null> {
    try {
      const from = fromBlock || 0;

      // Query Envio pour obtenir les transactions vers/depuis le contrat
      const query = {
        from_block: from,
        transactions: [
          {
            // Transactions vers le contrat (appels de fonctions)
            to: [address.toLowerCase()],
          },
        ],
        field_selection: {
          transaction: [
            'block_number',
            'hash',
            'from',
            'to',
            'value',
          ],
        },
        max_num_transactions: 100000, // Limite pour éviter de surcharger
      };

      const response = await axios.post(`${this.envioUrl}/query`, query, {
        timeout: 30000,
      });

      if (!response.data || !response.data.data) {
        return null;
      }

      const transactions = response.data.data;

      if (transactions.length === 0) {
        return null;
      }

      // Calculer les stats
      const uniqueUsers = new Set(transactions.map((tx: any) => tx.from?.toLowerCase()).filter(Boolean));
      const blocks = transactions.map((tx: any) => tx.block_number);

      return {
        address,
        txCount: transactions.length,
        eventCount: transactions.length, // Approximation: chaque tx = au moins 1 événement
        uniqueUsers: uniqueUsers.size,
        firstSeen: Math.min(...blocks),
        lastSeen: Math.max(...blocks),
        events: [], // On ne récupère plus les événements détaillés
      };
    } catch (error) {
      console.error(`  ❌ Erreur stats pour ${address}:`, error);
      return null;
    }
  }

  /**
   * 3. ENRICHIR UN PROTOCOLE AVEC LES STATS ENVIO + GOOGLE SHEETS
   */
  async enrichProtocol(protocol: MonadProtocol): Promise<EnrichedProtocol> {
    console.log(`\n🔍 Enrichissement de ${protocol.name}...`);

    // 1. Récupérer les données complémentaires depuis Google Sheets
    const googleSheetsData = await this.getGoogleSheetsData();
    const sheetsInfo = googleSheetsService.findByName(googleSheetsData, protocol.name);

    if (sheetsInfo) {
      console.log(`  📋 Données Google Sheets trouvées pour ${protocol.name}`);

      // Enrichir avec les données Google Sheets
      // PRIORITÉ AU LOGO GOOGLE SHEETS (écrase celui de GitHub)
      if (sheetsInfo.logo) {
        protocol.logo = sheetsInfo.logo;
        console.log(`     Logo: ${sheetsInfo.logo.substring(0, 50)}...`);
      }

      // Banner (uniquement depuis Google Sheets)
      if (sheetsInfo.banner) {
        protocol.banner = sheetsInfo.banner;
        console.log(`     Banner: ${sheetsInfo.banner.substring(0, 50)}...`);
      }

      if (sheetsInfo.website && !protocol.website) {
        protocol.website = sheetsInfo.website;
        console.log(`     Website: ${sheetsInfo.website}`);
      }
      if (sheetsInfo.twitter && !protocol.twitter) {
        protocol.twitter = sheetsInfo.twitter;
        console.log(`     Twitter: ${sheetsInfo.twitter}`);
      }
      if (sheetsInfo.description && !protocol.description) {
        protocol.description = sheetsInfo.description;
      }
      if (!protocol.category && (sheetsInfo.tags?.[0] || sheetsInfo.projectType)) {
        // Utiliser le premier tag comme catégorie
        protocol.category = sheetsInfo.tags?.[0] || sheetsInfo.projectType;
      }
      if (sheetsInfo.suspicious) {
        console.log(`     ⚠️ Marqué comme suspect/cassé dans Google Sheets`);
      }
    }

    // 2. Si pas de logo, générer un logo par défaut avec DiceBear
    if (!protocol.logo) {
      protocol.logo = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(protocol.name)}&backgroundColor=1e293b`;
      console.log(`     Logo par défaut généré`);
    }

    const enriched: EnrichedProtocol = {
      ...protocol,
      stats: {
        totalTxCount: 0,
        totalEventCount: 0,
        uniqueUsers: 0,
        contractCount: 0,
        firstActivity: null,
        lastActivity: null,
        activityScore: 0,
      },
      contracts: {},
    };

    if (!protocol.contracts || Object.keys(protocol.contracts).length === 0) {
      console.log('  ⚠️  Aucun contrat trouvé');
      return enriched;
    }

    const allUsers = new Set<string>();
    let oldestActivity: number | null = null;
    let newestActivity: number | null = null;

    // Pour chaque contrat du protocole
    for (const [contractName, address] of Object.entries(protocol.contracts)) {
      console.log(`  📊 ${contractName} (${address.substring(0, 10)}...)`);

      // Obtenir les stats via Envio
      const stats = await this.getContractStats(address);

      enriched.contracts[contractName] = {
        address,
        stats,
      };

      if (stats) {
        // Agréger les stats
        enriched.stats.totalTxCount += stats.txCount;
        enriched.stats.totalEventCount += stats.eventCount;
        enriched.stats.contractCount++;

        // Suivre les utilisateurs uniques (approximatif via topic1)
        // Note: Pour être plus précis, il faudrait parser les événements Transfer

        // Suivre les dates
        if (!oldestActivity || stats.firstSeen < oldestActivity) {
          oldestActivity = stats.firstSeen;
        }
        if (!newestActivity || stats.lastSeen > newestActivity) {
          newestActivity = stats.lastSeen;
        }

        console.log(`     ✓ ${stats.txCount} transactions, ${stats.eventCount} événements`);
      } else {
        console.log(`     ⚠️  Aucune activité trouvée`);
      }

      // Pause pour éviter de surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Approximation des utilisateurs uniques (somme, pas exact car peut y avoir des doublons entre contrats)
    enriched.stats.uniqueUsers = Object.values(enriched.contracts)
      .reduce((sum, c) => sum + (c.stats?.uniqueUsers || 0), 0);

    // Calculer les dates
    if (oldestActivity) {
      enriched.stats.firstActivity = new Date(oldestActivity * 1000);
    }
    if (newestActivity) {
      enriched.stats.lastActivity = new Date(newestActivity * 1000);
    }

    // Calculer un activity score (0-10)
    // Basé sur : nombre de transactions, utilisateurs, contrats actifs
    const txScore = Math.min(enriched.stats.totalTxCount / 1000, 10);
    const userScore = Math.min(enriched.stats.uniqueUsers / 100, 10);
    const contractScore = Math.min(enriched.stats.contractCount / 5, 10);

    enriched.stats.activityScore = (txScore * 0.5 + userScore * 0.3 + contractScore * 0.2);

    console.log(`\n  📈 Stats totales:`);
    console.log(`     Transactions: ${enriched.stats.totalTxCount.toLocaleString()}`);
    console.log(`     Événements: ${enriched.stats.totalEventCount.toLocaleString()}`);
    console.log(`     Utilisateurs uniques (approx): ${enriched.stats.uniqueUsers.toLocaleString()}`);
    console.log(`     Contrats actifs: ${enriched.stats.contractCount}`);
    console.log(`     Activity Score: ${enriched.stats.activityScore.toFixed(1)}/10`);

    return enriched;
  }

  /**
   * 4. ENRICHIR TOUS LES PROTOCOLES
   */
  async enrichAllProtocols(network: 'testnet' | 'mainnet' = 'testnet'): Promise<EnrichedProtocol[]> {
    console.log(`🚀 Enrichissement des protocoles Monad (${network})\n`);
    console.log('='.repeat(80));

    // 1. Récupérer les protocoles
    const protocols = await this.fetchMonadProtocols(network);

    if (protocols.length === 0) {
      console.log('⚠️  Aucun protocole trouvé');
      return [];
    }

    // 2. Enrichir chaque protocole
    const enriched: EnrichedProtocol[] = [];

    for (const protocol of protocols) {
      const enrichedProtocol = await this.enrichProtocol(protocol);
      enriched.push(enrichedProtocol);
    }

    // 3. Afficher le résumé
    console.log('\n' + '='.repeat(80));
    console.log('\n✅ Enrichissement terminé!\n');
    console.log('🏆 Top protocoles par activité:\n');

    // Trier par activity score
    const sorted = enriched
      .filter(p => p.stats.activityScore > 0)
      .sort((a, b) => b.stats.activityScore - a.stats.activityScore);

    sorted.slice(0, 10).forEach((protocol, index) => {
      const star = protocol.stats.activityScore >= 7 ? ' ⭐' : '';
      console.log(`${index + 1}. ${protocol.name}${star}`);
      console.log(`   Score: ${protocol.stats.activityScore.toFixed(1)}/10`);
      console.log(`   Transactions: ${protocol.stats.totalTxCount.toLocaleString()}`);
      console.log(`   Utilisateurs: ${protocol.stats.uniqueUsers.toLocaleString()}`);
      console.log(`   Contrats actifs: ${protocol.stats.contractCount}`);
      console.log('');
    });

    return enriched;
  }

  /**
   * 5. SAUVEGARDER DANS LA BASE DE DONNÉES
   */
  async saveToDatabase(enrichedProtocols: EnrichedProtocol[]): Promise<void> {
    console.log('💾 Sauvegarde dans la base de données...\n');

    for (const protocol of enrichedProtocols) {
      try {
        // Chercher une dApp existante avec le même nom
        const existing = await prisma.dApp.findFirst({
          where: {
            name: protocol.name,
          },
        });

        // Créer ou mettre à jour la dApp
        const dapp = existing
          ? await prisma.dApp.update({
              where: {
                id: existing.id,
              },
              data: {
                description: protocol.description,
                logoUrl: protocol.logo,
                website: protocol.website,
                category: this.mapCategory(protocol.category),
                totalTxCount: protocol.stats.totalTxCount,
                uniqueUsers: protocol.stats.uniqueUsers,
                qualityScore: protocol.stats.activityScore,
              },
            })
          : await prisma.dApp.create({
              data: {
                name: protocol.name,
                description: protocol.description,
                logoUrl: protocol.logo,
                website: protocol.website,
                category: this.mapCategory(protocol.category),
                totalTxCount: protocol.stats.totalTxCount,
                uniqueUsers: protocol.stats.uniqueUsers,
                qualityScore: protocol.stats.activityScore,
              },
            });

        // Créer les contrats
        for (const [contractName, contractData] of Object.entries(protocol.contracts)) {
          if (contractData.stats) {
            await prisma.contract.upsert({
              where: {
                address: contractData.address.toLowerCase(),
              },
              create: {
                address: contractData.address.toLowerCase(),
                name: contractName,
                type: 'CUSTOM',
                deploymentDate: protocol.stats.firstActivity || new Date(),
                dappId: dapp.id,
                txCount: contractData.stats.txCount,
                eventCount: contractData.stats.eventCount,
              },
              update: {
                name: contractName,
                txCount: contractData.stats.txCount,
                eventCount: contractData.stats.eventCount,
              },
            });
          }
        }

        console.log(`  ✓ ${protocol.name} sauvegardé`);
      } catch (error) {
        console.error(`  ❌ Erreur pour ${protocol.name}:`, error);
      }
    }

    console.log('\n✅ Sauvegarde terminée!');
  }

  /**
   * 6. EXPORTER EN JSON
   */
  async exportToJSON(enrichedProtocols: EnrichedProtocol[], filename: string = 'protocols_enriched.json'): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const filePath = path.join(process.cwd(), filename);
    await fs.writeFile(filePath, JSON.stringify(enrichedProtocols, null, 2));

    console.log(`\n✅ Données exportées vers ${filePath}`);
  }

  /**
   * Mapper les catégories vers le schema Prisma
   */
  private mapCategory(category?: string): any {
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
}

// Export singleton
export const protocolEnrichmentService = new ProtocolEnrichmentService();
