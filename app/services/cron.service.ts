/**
 * Service de gestion des tâches cron
 * Gère l'exécution et le suivi des tâches planifiées
 */

import { prisma } from '~/lib/db/prisma';
import { protocolEnrichmentService } from './protocol-enrichment.service';
import { protocolCacheService } from './protocol-cache.service';

export class CronService {
  /**
   * Enregistrer ou mettre à jour une tâche cron
   */
  async registerJob(
    name: string,
    intervalHours: number
  ): Promise<void> {
    const nextRun = new Date(Date.now() + intervalHours * 60 * 60 * 1000);

    await prisma.cronJob.upsert({
      where: { name },
      create: {
        name,
        nextRun,
        status: 'idle',
      },
      update: {
        nextRun,
      },
    });

    console.log(`📅 Tâche cron "${name}" programmée pour ${nextRun.toISOString()}`);
  }

  /**
   * Marquer une tâche comme en cours d'exécution
   */
  async markRunning(name: string): Promise<void> {
    await prisma.cronJob.update({
      where: { name },
      data: {
        status: 'running',
        lastRun: new Date(),
      },
    });
  }

  /**
   * Marquer une tâche comme terminée avec succès
   */
  async markCompleted(name: string, intervalHours: number): Promise<void> {
    const nextRun = new Date(Date.now() + intervalHours * 60 * 60 * 1000);

    await prisma.cronJob.update({
      where: { name },
      data: {
        status: 'idle',
        error: null,
        nextRun,
        runCount: {
          increment: 1,
        },
      },
    });

    console.log(`✅ Tâche cron "${name}" terminée. Prochaine exécution: ${nextRun.toISOString()}`);
  }

  /**
   * Marquer une tâche comme échouée
   */
  async markFailed(name: string, error: string, intervalHours: number): Promise<void> {
    const nextRun = new Date(Date.now() + intervalHours * 60 * 60 * 1000);

    await prisma.cronJob.update({
      where: { name },
      data: {
        status: 'failed',
        error,
        nextRun,
      },
    });

    console.error(`❌ Tâche cron "${name}" échouée: ${error}`);
  }

  /**
   * Vérifier si une tâche doit être exécutée
   */
  async shouldRun(name: string): Promise<boolean> {
    const job = await prisma.cronJob.findUnique({
      where: { name },
    });

    if (!job) {
      return true; // Première exécution
    }

    if (job.status === 'running') {
      return false; // Déjà en cours
    }

    if (job.nextRun && job.nextRun > new Date()) {
      return false; // Pas encore le moment
    }

    return true;
  }

  /**
   * TÂCHE CRON 1: Synchroniser la liste des protocoles GitHub
   * Exécution: Tous les jours (24h)
   */
  async syncGithubProtocols(): Promise<void> {
    const jobName = 'sync_github_protocols';
    const intervalHours = 24;

    try {
      // Vérifier si la tâche doit être exécutée
      const shouldRun = await this.shouldRun(jobName);
      if (!shouldRun) {
        console.log(`⏭️  Tâche "${jobName}" déjà exécutée récemment`);
        return;
      }

      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔄 TÂCHE CRON: Synchronisation des protocoles GitHub`);
      console.log(`${'='.repeat(80)}\n`);

      await this.markRunning(jobName);

      // Synchroniser testnet et mainnet avec forceRefresh
      await protocolEnrichmentService.fetchMonadProtocols('testnet', true);
      await protocolEnrichmentService.fetchMonadProtocols('mainnet', true);

      // Nettoyer les caches expirés
      await protocolCacheService.cleanup();

      await this.markCompleted(jobName, intervalHours);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      await this.markFailed(jobName, errorMessage, intervalHours);
      throw error;
    }
  }

  /**
   * TÂCHE CRON 2: Enrichir les protocoles avec les données Envio
   * Exécution: Toutes les 12h
   */
  async enrichProtocols(): Promise<void> {
    const jobName = 'enrich_protocols';
    const intervalHours = 12;

    try {
      // Vérifier si la tâche doit être exécutée
      const shouldRun = await this.shouldRun(jobName);
      if (!shouldRun) {
        console.log(`⏭️  Tâche "${jobName}" déjà exécutée récemment`);
        return;
      }

      console.log(`\n${'='.repeat(80)}`);
      console.log(`🔄 TÂCHE CRON: Enrichissement des protocoles`);
      console.log(`${'='.repeat(80)}\n`);

      await this.markRunning(jobName);

      // Enrichir les protocoles testnet
      const enriched = await protocolEnrichmentService.enrichAllProtocols('testnet');

      if (enriched.length > 0) {
        // Sauvegarder dans la base de données
        await protocolEnrichmentService.saveToDatabase(enriched);
      }

      await this.markCompleted(jobName, intervalHours);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      await this.markFailed(jobName, errorMessage, intervalHours);
      throw error;
    }
  }

  /**
   * Exécuter toutes les tâches cron qui doivent être exécutées
   */
  async runDueTasks(): Promise<void> {
    console.log('\n🔍 Vérification des tâches cron...\n');

    // Tâche 1: Sync GitHub (24h)
    if (await this.shouldRun('sync_github_protocols')) {
      await this.syncGithubProtocols();
    }

    // Tâche 2: Enrichissement (12h)
    if (await this.shouldRun('enrich_protocols')) {
      await this.enrichProtocols();
    }
  }

  /**
   * Obtenir le statut de toutes les tâches cron
   */
  async getStatus(): Promise<any[]> {
    const jobs = await prisma.cronJob.findMany({
      orderBy: { name: 'asc' },
    });

    return jobs.map(job => ({
      name: job.name,
      status: job.status,
      lastRun: job.lastRun,
      nextRun: job.nextRun,
      runCount: job.runCount,
      error: job.error,
    }));
  }

  /**
   * Forcer l'exécution d'une tâche
   */
  async forceRun(jobName: 'sync_github_protocols' | 'enrich_protocols'): Promise<void> {
    console.log(`\n⚡ Exécution forcée de la tâche: ${jobName}\n`);

    if (jobName === 'sync_github_protocols') {
      await this.syncGithubProtocols();
    } else if (jobName === 'enrich_protocols') {
      await this.enrichProtocols();
    }
  }
}

// Export singleton
export const cronService = new CronService();
