/**
 * Service de cache pour les protocoles
 * Gère le stockage et la récupération des données depuis la BDD
 */

import { prisma } from '~/lib/db/prisma';

export class ProtocolCacheService {
  /**
   * Récupérer les données du cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await prisma.protocolCache.findUnique({
        where: { key },
      });

      if (!cached) {
        console.log(`📦 Cache MISS pour ${key}`);
        return null;
      }

      // Vérifier si le cache a expiré
      if (cached.expiresAt < new Date()) {
        console.log(`⏰ Cache expiré pour ${key}`);
        await prisma.protocolCache.delete({ where: { key } });
        return null;
      }

      console.log(`✅ Cache HIT pour ${key}`);
      return JSON.parse(cached.data) as T;
    } catch (error) {
      console.error(`❌ Erreur lors de la lecture du cache ${key}:`, error);
      return null;
    }
  }

  /**
   * Sauvegarder les données dans le cache
   */
  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      await prisma.protocolCache.upsert({
        where: { key },
        create: {
          key,
          data: JSON.stringify(data),
          expiresAt,
        },
        update: {
          data: JSON.stringify(data),
          expiresAt,
        },
      });

      console.log(`💾 Cache sauvegardé pour ${key} (expire dans ${ttlSeconds}s)`);
    } catch (error) {
      console.error(`❌ Erreur lors de la sauvegarde du cache ${key}:`, error);
    }
  }

  /**
   * Supprimer une entrée du cache
   */
  async delete(key: string): Promise<void> {
    try {
      await prisma.protocolCache.delete({ where: { key } });
      console.log(`🗑️  Cache supprimé pour ${key}`);
    } catch (error) {
      // Ignorer si la clé n'existe pas
    }
  }

  /**
   * Nettoyer les caches expirés
   */
  async cleanup(): Promise<number> {
    try {
      const result = await prisma.protocolCache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      console.log(`🧹 ${result.count} entrées de cache expirées supprimées`);
      return result.count;
    } catch (error) {
      console.error('❌ Erreur lors du nettoyage du cache:', error);
      return 0;
    }
  }

  /**
   * Invalider tout le cache
   */
  async invalidateAll(): Promise<void> {
    try {
      await prisma.protocolCache.deleteMany({});
      console.log('🗑️  Tout le cache a été invalidé');
    } catch (error) {
      console.error('❌ Erreur lors de l\'invalidation du cache:', error);
    }
  }
}

// Export singleton
export const protocolCacheService = new ProtocolCacheService();
