import { EventEmitter } from 'events';
import { EnvioService } from './envio.service';
import { ContractDetectorService } from './contract-detector.service';
import { MetadataEnrichmentService } from './metadata-enrichment.service';
import { prisma } from '~/lib/db/prisma';

export interface ScanProgress {
  currentBlock: number;
  totalBlocks: number;
  dappsDiscovered: number;
  contractsFound: number;
  progress: number;
  status: 'idle' | 'scanning' | 'completed' | 'error';
  error?: string;
}

export interface DiscoveredDApp {
  id: string;
  name: string | null;
  description: string | null;
  logoUrl: string | null;
  symbol: string | null;
  category: string;
  contractCount: number;
  contracts: Array<{
    address: string;
    type: string;
    deploymentDate: Date;
  }>;
  discoveredAt: Date;
  // Quality scoring
  qualityScore: number;
  activityScore: number;
  diversityScore: number;
  ageScore: number;
}

class DiscoveryScannerService extends EventEmitter {
  private isScanning = false;
  private envioService: EnvioService;
  private contractDetectorService: ContractDetectorService;
  private metadataEnrichmentService: MetadataEnrichmentService;
  private emittedDAppIds = new Set<string>(); // Suivre les dApps déjà émises
  private progress: ScanProgress = {
    currentBlock: 0,
    totalBlocks: 10000,
    dappsDiscovered: 0,
    contractsFound: 0,
    progress: 0,
    status: 'idle'
  };

  constructor() {
    super();
    this.envioService = new EnvioService({
      hyperSyncUrl: process.env.ENVIO_HYPERSYNC_URL || 'https://monad-testnet.hypersync.xyz',
      chainId: process.env.MONAD_CHAIN_ID || 'monad-testnet'
    });
    this.contractDetectorService = new ContractDetectorService(this.envioService as any);
    this.metadataEnrichmentService = new MetadataEnrichmentService();
  }

  async startScan(): Promise<void> {
    if (this.isScanning) {
      throw new Error('Un scan est déjà en cours');
    }

    this.isScanning = true;
    this.emittedDAppIds.clear(); // Réinitialiser le suivi des dApps émises
    this.progress = {
      currentBlock: 0,
      totalBlocks: 100000, // Scan des 100 000 derniers blocs
      dappsDiscovered: 0,
      contractsFound: 0,
      progress: 0,
      status: 'scanning'
    };

    try {
      console.log('\n🔍 Démarrage de la découverte...\n');
      this.emit('progress', this.progress);

      // Utiliser Envio HyperSync pour découvrir les dApps actives
      console.log('📊 Analyse de 100 000 blocs');
      const discoveredContracts = await this.envioService.discoverContracts({
        maxBlocks: 100000, // Analyser les 100 000 derniers blocs
        maxContracts: 5000, // Top 5000 contrats les plus actifs
        maxDApps: 20, // Limite à 20 dApps uniques
      });

      // Log avec le nombre d'événements (simulé pour l'instant)
      const totalEvents = discoveredContracts.reduce((sum, c) => sum + ((c as any).eventCount || 0), 0);
      console.log(`✓ ${totalEvents.toLocaleString()} événements récupérés`);
      console.log(`✓ Top ${discoveredContracts.length} contrats actifs trouvés`);
      console.log('\n🔍 Recherche des deployers...');

      // Traiter chaque contrat découvert
      for (const contract of discoveredContracts) {
        if (!this.isScanning) {
          break; // Arrêt demandé
        }

        try {
          // Sauvegarder le contrat dans la base de données
          await this.contractDetectorService.saveContract(
            contract.address,
            contract.deployer,
            new Date(contract.timestamp * 1000)
          );

          // Récupérer l'eventCount et eventTypes
          const eventCount = (contract as any).eventCount || 0;
          const eventTypes = (contract as any).eventTypes || [];

          // Classification intelligente basée sur les événements
          const classification = this.envioService.classifyContractByEvents(eventTypes);

          // Si le contrat a des événements, c'est probablement un contrat actif
          if (eventCount > 0) {
            await this.contractDetectorService.analyzeAndGroupContract(
              contract.address,
              eventCount
            );
          }

          // Mettre à jour les statistiques
          this.progress.contractsFound = await prisma.contract.count();
          this.progress.dappsDiscovered = await prisma.dApp.count();

          // Récupérer les dernières dApps créées
          const recentDApps = await prisma.dApp.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
          });

          // Émettre les événements UNIQUEMENT pour les NOUVELLES dApps (pas encore émises)
          for (const dapp of recentDApps) {
            if (!this.emittedDAppIds.has(dapp.id)) {
              const dappNumber = this.emittedDAppIds.size + 1;

              console.log(`  🎉 Nouvelle dApp découverte (${dappNumber}/20): ${dapp.name || `Factory ${dapp.deployer.substring(0, 10)}...`} (${classification.type})`);

              // Enrichir la dApp avec les métadonnées on-chain et externes
              console.log(`     🔍 Identification de la dApp via sources externes...`);
              await this.metadataEnrichmentService.enrichDApp(dapp.id);

              // Enrichir aussi le contrat principal
              await this.metadataEnrichmentService.enrichContract(contract.address);

              // Mettre à jour la catégorie basée sur la classification
              if (classification.confidence > 0.5) {
                await prisma.dApp.update({
                  where: { id: dapp.id },
                  data: { category: classification.type },
                });
              }

              console.log(`     📊 Classé comme ${classification.type} (confidence: ${classification.confidence}%)`);

              // Calculer et mettre à jour le quality score
              await this.contractDetectorService.updateQualityScore(dapp.id);

              // Mettre à jour le contrat avec les métriques
              await prisma.contract.update({
                where: { address: contract.address },
                data: {
                  eventCount,
                  name: undefined, // Sera enrichi par MetadataEnrichmentService
                  symbol: undefined,
                },
              });

              // Récupérer la dApp mise à jour avec le quality score
              const updatedDApp = await prisma.dApp.findUnique({
                where: { id: dapp.id },
              });

              if (updatedDApp) {
                console.log(`     ✓ Quality score: ${updatedDApp.qualityScore.toFixed(1)}/10\n`);
              }

              const discoveredDApp = await this.formatDiscoveredDApp(dapp.id);
              this.emit('dapp-discovered', discoveredDApp);
              this.emittedDAppIds.add(dapp.id); // Marquer comme émise
            }
          }

          // Mettre à jour la progression
          const contractsProcessed = discoveredContracts.indexOf(contract) + 1;
          this.progress.currentBlock = contractsProcessed; // Utilise le même champ mais change la sémantique
          this.progress.progress = Math.round((contractsProcessed / discoveredContracts.length) * 100);
          this.emit('progress', this.progress);

        } catch (error) {
          console.error(`Erreur lors du traitement du contrat ${contract.address}:`, error);
          // Continue avec le contrat suivant
        }
      }

      this.progress.status = 'completed';
      this.progress.progress = 100;
      this.emit('progress', this.progress);
      this.emit('completed', this.progress);

      console.log('\n✅ Découverte terminée !\n');

      // Afficher le top des dApps découvertes
      const topDApps = await prisma.dApp.findMany({
        orderBy: { qualityScore: 'desc' },
        take: 5,
      });

      if (topDApps.length > 0) {
        console.log('🏆 Top dApps découvertes:');
        topDApps.forEach((dapp, index) => {
          const star = dapp.qualityScore >= 7 ? ' ⭐' : '';
          console.log(`${index + 1}. ${dapp.name || `Factory ${dapp.deployer.substring(0, 10)}...`} (${dapp.category}) - Score: ${dapp.qualityScore.toFixed(1)}/10${star}`);
        });
        console.log('');
      }

    } catch (error) {
      this.progress.status = 'error';
      this.progress.error = error instanceof Error ? error.message : 'Erreur inconnue';
      this.emit('error', this.progress);
      console.error('❌ Erreur lors du scan:', error);
      throw error;
    } finally {
      this.isScanning = false;
    }
  }

  async stopScan(): Promise<void> {
    this.isScanning = false;
    this.progress.status = 'idle';
    this.emit('stopped', this.progress);
  }

  getProgress(): ScanProgress {
    return { ...this.progress };
  }


  private async formatDiscoveredDApp(dappId: string): Promise<DiscoveredDApp> {
    const dapp = await prisma.dApp.findUnique({
      where: { id: dappId },
      include: {
        contracts: {
          orderBy: { deploymentDate: 'desc' },
          take: 5
        }
      }
    });

    if (!dapp) {
      throw new Error('DApp not found');
    }

    return {
      id: dapp.id,
      name: dapp.name,
      description: dapp.description,
      logoUrl: dapp.logoUrl,
      symbol: dapp.symbol,
      category: dapp.category,
      contractCount: dapp.contracts.length,
      contracts: dapp.contracts.map((c: any) => ({
        address: c.address,
        type: c.type,
        deploymentDate: c.deploymentDate
      })),
      discoveredAt: dapp.createdAt,
      // Ajout des quality scores
      qualityScore: dapp.qualityScore,
      activityScore: dapp.activityScore,
      diversityScore: dapp.diversityScore,
      ageScore: dapp.ageScore,
    };
  }
}

export const discoveryScannerService = new DiscoveryScannerService();
