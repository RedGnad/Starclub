/**
 * Script d'initialisation des tâches cron
 * À exécuter une fois pour démarrer le système de cache et cron
 *
 * Usage:
 *   npx tsx scripts/init-cron.ts
 */

import 'dotenv/config';
import { cronService } from '../app/services/cron.service';

async function main() {
  console.log('\n🚀 Initialisation du système de cache et cron\n');
  console.log('='.repeat(80));

  try {
    // 1. Enregistrer les tâches cron
    console.log('\n📅 Enregistrement des tâches cron...\n');
    await cronService.registerJob('sync_github_protocols', 24);
    await cronService.registerJob('enrich_protocols', 12);

    // 2. Exécuter immédiatement la synchronisation GitHub
    console.log('\n🔄 Synchronisation initiale des protocoles GitHub...\n');
    await cronService.syncGithubProtocols();

    // 3. Exécuter l'enrichissement initial
    console.log('\n🔄 Enrichissement initial des protocoles...\n');
    await cronService.enrichProtocols();

    // 4. Afficher le statut
    console.log('\n📊 Statut des tâches cron:\n');
    const status = await cronService.getStatus();
    status.forEach(job => {
      console.log(`  ${job.name}:`);
      console.log(`    Status: ${job.status}`);
      console.log(`    Dernière exécution: ${job.lastRun || 'Jamais'}`);
      console.log(`    Prochaine exécution: ${job.nextRun || 'Non programmée'}`);
      console.log(`    Nombre d'exécutions: ${job.runCount}`);
      console.log('');
    });

    console.log('='.repeat(80));
    console.log('\n✅ Initialisation terminée avec succès!\n');
    console.log('💡 Les tâches cron sont maintenant programmées:');
    console.log('   - sync_github_protocols: Tous les jours (24h)');
    console.log('   - enrich_protocols: Toutes les 12h\n');
    console.log('📝 Pour exécuter le worker en continu:');
    console.log('   npm run cron:watch\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  }
}

main();
