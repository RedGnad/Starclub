/**
 * Worker pour les tâches cron
 * Vérifie et exécute les tâches planifiées
 *
 * Usage:
 *   npx tsx scripts/cron-worker.ts            # Exécuter une fois
 *   npx tsx scripts/cron-worker.ts --watch    # Mode continu (vérifie toutes les 5 minutes)
 */

import 'dotenv/config';
import { cronService } from '../app/services/cron.service';

async function runOnce() {
  console.log('\n🚀 Démarrage du worker cron\n');
  console.log(`⏰ ${new Date().toISOString()}\n`);

  try {
    // Enregistrer les tâches si elles n'existent pas
    await cronService.registerJob('sync_github_protocols', 24);
    await cronService.registerJob('enrich_protocols', 12);

    // Exécuter les tâches qui doivent l'être
    await cronService.runDueTasks();

    console.log('\n✅ Worker cron terminé\n');
  } catch (error) {
    console.error('\n❌ Erreur dans le worker cron:', error);
    process.exit(1);
  }
}

async function runContinuous() {
  console.log('🔄 Mode continu activé - Vérification toutes les 5 minutes');

  // Exécuter immédiatement
  await runOnce();

  // Puis toutes les 5 minutes
  setInterval(async () => {
    await runOnce();
  }, 5 * 60 * 1000); // 5 minutes
}

async function main() {
  const watchMode = process.argv.includes('--watch');

  if (watchMode) {
    await runContinuous();
  } else {
    await runOnce();
    process.exit(0);
  }
}

main();
