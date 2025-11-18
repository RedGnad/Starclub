import { prisma } from '~/lib/db/prisma';
import { ContractType, DAppCategory } from '@prisma/client';

// Interface générique pour les services d'indexation
interface IndexerService {
  getContractActivity(address: string, ...args: any[]): Promise<{
    holderCount?: number;
    logCount?: number;
    isActive?: boolean;
  }>;
}

/**
 * Service pour détecter et analyser les contrats déployés
 * Compatible avec différents services d'indexation (Envio, etc.)
 */
export class ContractDetectorService {
  constructor(private indexerService: IndexerService) {}

  /**
   * Sauvegarde un contrat dans la base de données
   */
  async saveContract(
    address: string,
    deployer: string,
    deploymentDate: Date
  ): Promise<void> {
    try {
      // Vérifier si le contrat existe déjà
      const existing = await prisma.contract.findUnique({
        where: { address: address.toLowerCase() },
      });

      if (existing) {
        console.log(`Contrat ${address} déjà enregistré`);
        return;
      }

      // Déterminer le type de contrat via l'API d'indexation
      const contractType = await this.detectContractTypeViaAPI(address);

      // Créer le contrat dans la base de données
      await prisma.contract.create({
        data: {
          address: address.toLowerCase(),
          bytecodeHash: '', // On pourrait le calculer si nécessaire via RPC
          type: contractType,
          creatorAddress: deployer.toLowerCase(),
          transactionHash: '', // Disponible si nécessaire
          blockNumber: BigInt(0), // On pourrait le récupérer si nécessaire
          deploymentDate,
        },
      });

      console.log(`✓ Contrat enregistré: ${address} (${contractType})`);
    } catch (error) {
      console.error(`Erreur lors de l'enregistrement du contrat ${address}:`, error);
      throw error;
    }
  }

  /**
   * Analyse un contrat et le groupe en dApp si nécessaire
   */
  async analyzeAndGroupContract(
    address: string,
    holderCount: number
  ): Promise<void> {
    try {
      const contract = await prisma.contract.findUnique({
        where: { address: address.toLowerCase() },
      });

      if (!contract) {
        console.log(`Contrat ${address} non trouvé dans la base de données`);
        return;
      }

      // Vérifier si le contrat fait déjà partie d'une dApp
      if (contract.dappId) {
        console.log(`Contrat ${address} déjà associé à une dApp`);
        return;
      }

      // Nouvelle logique améliorée : analyser si c'est vraiment une dApp
      const isDApp = await this.isLikelyDApp(contract, holderCount);

      if (isDApp) {
        await this.createOrUpdateDApp(contract, holderCount);
      } else {
        console.log(`⊘ Contrat ${address} ignoré : token simple, pas une dApp`);
      }
    } catch (error) {
      console.error(`Erreur lors de l'analyse du contrat ${address}:`, error);
    }
  }

  /**
   * Crée ou met à jour une dApp pour un contrat
   */
  private async createOrUpdateDApp(
    contract: any,
    holderCount: number
  ): Promise<void> {
    try {
      const creatorAddress = contract.creatorAddress?.toLowerCase();

      if (!creatorAddress) {
        console.warn(`Pas de creatorAddress pour le contrat ${contract.address}, skip grouping`);
        return;
      }

      // Chercher une dApp existante avec le même créateur (factory)
      // On cherche directement dans tous les contrats, pas seulement ceux déjà liés
      const existingContractWithSameCreator = await prisma.contract.findFirst({
        where: {
          creatorAddress: creatorAddress,
          dappId: { not: null },
        },
        include: {
          dapp: true,
        },
      });

      if (existingContractWithSameCreator && existingContractWithSameCreator.dapp) {
        // Associer le contrat à la dApp existante
        await prisma.contract.update({
          where: { id: contract.id },
          data: { dappId: existingContractWithSameCreator.dapp.id },
        });
        console.log(`Contrat ${contract.address} associé à la dApp existante ${existingContractWithSameCreator.dapp.id} (factory: ${creatorAddress.substring(0, 10)}...)`);
      } else {
        // Créer une nouvelle dApp pour cette factory
        const category = this.determineCategory(contract.type);
        const dapp = await prisma.dApp.create({
          data: {
            name: `DApp Factory ${creatorAddress.substring(0, 10)}`,
            description: `DApp découverte automatiquement via factory ${creatorAddress}. Contrats déployés par cette factory.`,
            category,
            contracts: {
              connect: { id: contract.id },
            },
          },
        });
        console.log(`✓ Nouvelle dApp créée: ${dapp.id} (factory: ${creatorAddress.substring(0, 10)}..., ${category})`);
      }
    } catch (error) {
      console.error('Erreur lors de la création/mise à jour de la dApp:', error);
    }
  }

  /**
   * Détecte le type de contrat via l'API d'indexation (en vérifiant s'il a de l'activité)
   */
  private async detectContractTypeViaAPI(address: string): Promise<ContractType> {
    try {
      // Essayer de récupérer l'activité du contrat
      const activity = await this.indexerService.getContractActivity(address);

      // Vérifier s'il a de l'activité (holders ou logs)
      const hasActivity = (activity.holderCount && activity.holderCount > 0) ||
                         (activity.logCount && activity.logCount > 0) ||
                         activity.isActive;

      if (hasActivity) {
        // Si le contrat a de l'activité, c'est probablement un token
        return ContractType.ERC20; // Par défaut, considérer comme ERC20
      }

      return ContractType.CUSTOM;
    } catch (error) {
      console.log(`Impossible de détecter le type pour ${address}, utilisation de CUSTOM`);
      return ContractType.CUSTOM;
    }
  }

  /**
   * Détermine si un contrat fait probablement partie d'une vraie dApp
   * ou s'il s'agit juste d'un token simple
   */
  private async isLikelyDApp(contract: any, holderCount: number): Promise<boolean> {
    // Règle 1 : Si ce n'est pas un token, ce n'est probablement pas une dApp non plus
    if (!this.isTokenContract(contract.type)) {
      // Les contrats CUSTOM peuvent être des protocoles, on vérifie s'il y a d'autres contrats du même créateur
      if (contract.type === ContractType.CUSTOM) {
        return await this.hasMultipleContracts(contract.creatorAddress);
      }
      return false;
    }

    // Règle 2 : Vérifier si ce créateur a déployé plusieurs contrats (pattern factory/protocole)
    const contractsFromSameCreator = await this.countContractsFromCreator(contract.creatorAddress);

    if (contractsFromSameCreator >= 3) {
      // 3+ contrats du même créateur = probablement un protocole
      console.log(`✓ Protocole détecté : ${contractsFromSameCreator} contrats du créateur ${contract.creatorAddress.substring(0, 10)}...`);
      return true;
    }

    // Règle 3 : 2 contrats avec activité = protocole simple
    if (contractsFromSameCreator === 2 && holderCount > 10) {
      console.log(`✓ Protocole simple détecté : 2 contrats, ${holderCount} holders`);
      return true;
    }

    // Règle 4 : Contrat unique MAIS avec forte activité = protocole standalone important
    // Si on arrive ici avec holderCount > 0, c'est qu'il a de l'activité
    // On l'accepte pour découvrir les protocoles populaires
    if (contractsFromSameCreator === 1 && holderCount > 0) {
      console.log(`✓ Contrat actif accepté : ${contract.address} (${holderCount} événements)`);
      return true;
    }

    // Par défaut, ne pas considérer comme une dApp
    console.log(`⊘ Pas assez de contrats liés pour ${contract.address}`);
    return false;
  }

  /**
   * Compte le nombre de contrats déployés par le même créateur
   */
  private async countContractsFromCreator(creatorAddress: string | null): Promise<number> {
    if (!creatorAddress) return 0;

    const count = await prisma.contract.count({
      where: {
        creatorAddress: creatorAddress.toLowerCase(),
      },
    });

    return count;
  }

  /**
   * Vérifie si un créateur a déployé plusieurs contrats
   */
  private async hasMultipleContracts(creatorAddress: string | null): Promise<boolean> {
    const count = await this.countContractsFromCreator(creatorAddress);
    return count >= 2;
  }

  /**
   * Vérifie si un contrat est un token
   */
  private isTokenContract(type: ContractType): boolean {
    const tokenTypes: ContractType[] = [ContractType.ERC20, ContractType.ERC721, ContractType.ERC1155];
    return tokenTypes.includes(type);
  }

  /**
   * Détermine la catégorie d'une dApp basée sur le type de contrat
   */
  private determineCategory(type: ContractType): DAppCategory {
    switch (type) {
      case ContractType.ERC20:
        return DAppCategory.TOKEN;
      case ContractType.ERC721:
      case ContractType.ERC1155:
        return DAppCategory.NFT;
      default:
        return DAppCategory.UNKNOWN;
    }
  }

  /**
   * Calcule le quality score d'une dApp
   */
  async calculateQualityScore(dappId: string): Promise<{
    qualityScore: number;
    activityScore: number;
    diversityScore: number;
    ageScore: number;
  }> {
    try {
      const dapp = await prisma.dApp.findUnique({
        where: { id: dappId },
        include: {
          contracts: true,
          activities: {
            orderBy: { date: 'desc' },
            take: 30, // Derniers 30 jours d'activité
          },
        },
      });

      if (!dapp) {
        throw new Error('DApp not found');
      }

      // 1. Activity Score (basé sur le nombre total de transactions)
      const totalTxCount = dapp.activities.reduce((sum, a) => sum + a.txCount, 0);
      const activityScore = Math.min(totalTxCount / 1000, 10); // Max 10 points, 1 point = 100 tx

      // 2. Diversity Score (basé sur le nombre d'utilisateurs uniques)
      const totalUsers = dapp.activities.reduce((sum, a) => sum + a.userCount, 0);
      const diversityScore = Math.min(totalUsers / 100, 10); // Max 10 points, 1 point = 10 users

      // 3. Age Score (basé sur l'ancienneté)
      const oldestContract = dapp.contracts.reduce((oldest, contract) => {
        if (!contract.deploymentDate) return oldest;
        if (!oldest || contract.deploymentDate < oldest) return contract.deploymentDate;
        return oldest;
      }, null as Date | null);

      let ageScore = 0;
      if (oldestContract) {
        const daysOld = Math.floor(
          (Date.now() - oldestContract.getTime()) / (1000 * 60 * 60 * 24)
        );
        ageScore = Math.min(daysOld / 30, 10); // Max 10 points, 1 point = 3 jours
      }

      // 4. Contract Count Score (basé sur le nombre de contrats)
      const contractCountScore = Math.min(dapp.contracts.length / 5, 10); // Max 10, 1 point = 0.5 contrats

      // Score total : moyenne pondérée
      const qualityScore =
        activityScore * 0.35 +      // 35% weight
        diversityScore * 0.3 +       // 30% weight
        ageScore * 0.2 +             // 20% weight
        contractCountScore * 0.15;   // 15% weight

      return {
        qualityScore: Math.round(qualityScore * 10) / 10, // Arrondir à 1 décimale
        activityScore: Math.round(activityScore * 10) / 10,
        diversityScore: Math.round(diversityScore * 10) / 10,
        ageScore: Math.round(ageScore * 10) / 10,
      };
    } catch (error) {
      console.error('Erreur lors du calcul du quality score:', error);
      return {
        qualityScore: 0,
        activityScore: 0,
        diversityScore: 0,
        ageScore: 0,
      };
    }
  }

  /**
   * Met à jour le quality score d'une dApp
   */
  async updateQualityScore(dappId: string): Promise<void> {
    try {
      const scores = await this.calculateQualityScore(dappId);

      await prisma.dApp.update({
        where: { id: dappId },
        data: scores,
      });

      console.log(`✓ Quality score mis à jour pour dApp ${dappId}: ${scores.qualityScore}/10`);
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du quality score:`, error);
    }
  }

}
