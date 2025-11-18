/**
 * Script pour enrichir les protocoles officiels Monad avec des stats d'activité
 * Récupère les protocoles depuis https://github.com/monad-crypto/protocols
 * Et ajoute les stats via Envio (transactions, utilisateurs, événements)
 *
 * Usage:
 *   npx tsx scripts/enrich-monad-protocols.ts
 *   npx tsx scripts/enrich-monad-protocols.ts mainnet  # Pour mainnet
 */

import 'dotenv/config';
import { protocolEnrichmentService } from '../app/services/protocol-enrichment.service';

async function main() {
  const network = process.argv[2] || 'testnet'; // testnet par défaut

  console.log(`\n🚀 Enrichissement des protocoles Monad (${network})\n`);

  try {
    // 1. Enrichir tous les protocoles
    const enriched = await protocolEnrichmentService.enrichAllProtocols();

    if (enriched.length === 0) {
      console.log('⚠️  Aucun protocole à enrichir');
      process.exit(0);
    }

    // 2. Sauvegarder dans la base de données
    await protocolEnrichmentService.saveToDatabase(enriched);

    // 3. Exporter en JSON
    await protocolEnrichmentService.exportToJSON(enriched, `protocols_${network}_enriched.json`);

    console.log('\n✅ Script terminé avec succès!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur fatale:', error);
    process.exit(1);
  }
}

main();
