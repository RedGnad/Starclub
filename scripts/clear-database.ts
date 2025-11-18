import { prisma } from '../app/lib/db/prisma';

/**
 * Script pour nettoyer la base de données
 * Supprime tous les contrats et dApps pour repartir de zéro
 */
async function clearDatabase() {
  console.log('🧹 Nettoyage de la base de données...');

  try {
    // Supprimer tous les contrats (cascade supprimera les relations)
    const deletedContracts = await prisma.contract.deleteMany({});
    console.log(`✓ ${deletedContracts.count} contrats supprimés`);

    // Supprimer toutes les dApps
    const deletedDApps = await prisma.dApp.deleteMany({});
    console.log(`✓ ${deletedDApps.count} dApps supprimées`);

    console.log('✅ Base de données nettoyée avec succès');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
