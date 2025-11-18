# Système de Cache et Tâches Cron

Ce document décrit le système de cache et de tâches planifiées pour l'enrichissement des protocoles Monad.

## Vue d'ensemble

Le système comprend:
- **Cache en base de données** pour stocker les listes de protocoles GitHub
- **Tâches cron** pour maintenir les données à jour automatiquement
- **API de gestion** pour contrôler les tâches manuellement

## Architecture

### Services

#### 1. ProtocolCacheService (`app/services/protocol-cache.service.ts`)
Gère le cache des données dans la base de données SQLite.

**Méthodes principales:**
- `get<T>(key: string)`: Récupère une entrée du cache
- `set<T>(key, data, ttlSeconds)`: Sauvegarde une entrée avec expiration
- `delete(key)`: Supprime une entrée
- `cleanup()`: Nettoie les entrées expirées
- `invalidateAll()`: Vide tout le cache

**Clés de cache:**
- `github_protocols_testnet`: Liste des protocoles testnet (TTL: 24h)
- `github_protocols_mainnet`: Liste des protocoles mainnet (TTL: 24h)

#### 2. CronService (`app/services/cron.service.ts`)
Gère l'exécution des tâches planifiées.

**Tâches:**

##### Tâche 1: `sync_github_protocols` (Toutes les 24h)
- Synchronise la liste des protocoles depuis GitHub
- Force le rafraîchissement du cache
- Nettoie les caches expirés

##### Tâche 2: `enrich_protocols` (Toutes les 12h)
- Enrichit les protocoles avec les données Envio
- Calcule les stats (transactions, utilisateurs, événements)
- Sauvegarde dans la base de données

**Méthodes principales:**
- `registerJob(name, intervalHours)`: Enregistre une tâche
- `runDueTasks()`: Exécute les tâches qui doivent l'être
- `forceRun(jobName)`: Force l'exécution d'une tâche
- `getStatus()`: Récupère le statut de toutes les tâches

### Modèles Prisma

#### ProtocolCache
```prisma
model ProtocolCache {
  id          String   @id @default(cuid())
  key         String   @unique
  data        String   // JSON stringified
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### CronJob
```prisma
model CronJob {
  id          String   @id @default(cuid())
  name        String   @unique
  lastRun     DateTime?
  nextRun     DateTime?
  status      String   @default("idle") // 'idle', 'running', 'failed'
  error       String?
  runCount    Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Utilisation

### Initialisation (première fois)

```bash
# Initialise le cache et exécute les tâches une première fois
npm run cron:init
```

Cette commande:
1. Enregistre les tâches cron dans la BDD
2. Synchronise les protocoles GitHub (testnet + mainnet)
3. Enrichit les protocoles avec Envio
4. Affiche le statut des tâches

### Mode Worker (production)

#### Exécution unique
```bash
# Vérifie et exécute les tâches qui doivent l'être
npm run cron:run
```

#### Mode continu (recommandé)
```bash
# Vérifie les tâches toutes les 5 minutes
npm run cron:watch
```

**Note:** En production, utilisez un gestionnaire de processus comme PM2:
```bash
pm2 start "npm run cron:watch" --name "sherlock-cron"
```

### Commandes manuelles

#### Forcer la synchronisation GitHub
```bash
npm run cron:sync
```

#### Forcer l'enrichissement
```bash
npm run cron:enrich
```

## API Routes

### GET /api/cron/status
Récupère le statut de toutes les tâches cron.

**Réponse:**
```json
{
  "success": true,
  "jobs": [
    {
      "name": "sync_github_protocols",
      "status": "idle",
      "lastRun": "2025-01-07T10:30:00.000Z",
      "nextRun": "2025-01-08T10:30:00.000Z",
      "runCount": 5,
      "error": null
    },
    {
      "name": "enrich_protocols",
      "status": "idle",
      "lastRun": "2025-01-07T16:00:00.000Z",
      "nextRun": "2025-01-08T04:00:00.000Z",
      "runCount": 12,
      "error": null
    }
  ]
}
```

### POST /api/cron/run
Exécute manuellement une tâche cron.

**Body:**
```json
{
  "job": "sync_github_protocols" // ou "enrich_protocols"
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Tâche \"sync_github_protocols\" exécutée avec succès"
}
```

## Fonctionnement du Cache

### Flux d'exécution

#### Sans cache (première fois ou cache expiré)
```
fetchMonadProtocols()
  → Appel GitHub API
  → Parse les fichiers .json
  → Sauvegarde dans cache (TTL: 24h)
  → Retourne les données
```

#### Avec cache valide
```
fetchMonadProtocols()
  → Vérifie le cache
  → Cache HIT ✅
  → Retourne directement les données (rapide!)
```

### Avantages

1. **Performance**: Les données sont servies depuis la BDD (très rapide)
2. **Résilience**: Si GitHub est down, le cache reste disponible
3. **Rate limiting**: Réduit drastiquement les appels à l'API GitHub
4. **Coût**: Moins de requêtes = moins de risque de dépasser les quotas

## Planification des tâches

### Timeline typique

```
00:00 - Minuit
04:00 - Enrichissement (12h depuis 16:00)
08:00 -
10:30 - Sync GitHub (24h depuis hier 10:30)
12:00 -
16:00 - Enrichissement (12h depuis 04:00)
20:00 -
```

### Personnalisation

Pour modifier les intervalles, éditez les constantes dans `cron.service.ts`:

```typescript
// Sync GitHub
const intervalHours = 24; // Modifier ici

// Enrichissement
const intervalHours = 12; // Modifier ici
```

## Monitoring

### Logs

Les tâches cron produisent des logs détaillés:

```
🔄 TÂCHE CRON: Synchronisation des protocoles GitHub
================================================================================

📥 Récupération des protocoles depuis GitHub (testnet)...
  ✓ Protocol A (3 contrats)
  ✓ Protocol B (5 contrats)

✓ 150 protocoles récupérés

💾 Cache sauvegardé pour github_protocols_testnet (expire dans 86400s)

✅ Tâche cron "sync_github_protocols" terminée. Prochaine exécution: 2025-01-08T10:30:00.000Z
```

### Vérifier le statut

#### Via CLI
```bash
# Statut simple
npm run cron:run

# Status détaillé
npx tsx -e "import('dotenv/config');import('./app/services/cron.service.js').then(m=>m.cronService.getStatus().then(console.log))"
```

#### Via API
```bash
curl http://localhost:5173/api/cron/status
```

#### Via la base de données
```sql
-- Vérifier les tâches
SELECT * FROM cron_jobs;

-- Vérifier le cache
SELECT key, expiresAt, length(data) as size
FROM protocol_cache;
```

## Dépannage

### Le cache ne fonctionne pas

1. Vérifier que la migration a été exécutée:
   ```bash
   npx prisma migrate status
   ```

2. Vérifier les entrées de cache:
   ```bash
   npx prisma studio
   # → Ouvrir la table "protocol_cache"
   ```

### Les tâches ne s'exécutent pas

1. Vérifier l'état des tâches:
   ```bash
   npm run cron:run
   ```

2. Vérifier les logs d'erreur dans la table `cron_jobs`:
   ```sql
   SELECT name, status, error, lastRun, nextRun FROM cron_jobs;
   ```

3. Forcer l'exécution manuellement:
   ```bash
   npm run cron:sync
   npm run cron:enrich
   ```

### Cache expiré trop rapidement

Le TTL est défini à 24h. Pour le modifier:

```typescript
// Dans protocol-enrichment.service.ts
await protocolCacheService.set(cacheKey, protocols, 86400); // 86400 = 24h en secondes
```

### Nettoyer tout le cache

```bash
npx tsx -e "import('dotenv/config');import('./app/services/protocol-cache.service.js').then(m=>m.protocolCacheService.invalidateAll())"
```

## Déploiement

### Configuration PM2 (recommandé)

Créer `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'sherlock-web',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'sherlock-cron',
      script: 'npm',
      args: 'run cron:watch',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
```

Puis:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Alternative: Systemd

Créer `/etc/systemd/system/sherlock-cron.service`:

```ini
[Unit]
Description=Sherlock Cron Worker
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/sherlock
ExecStart=/usr/bin/npm run cron:watch
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Activer:
```bash
sudo systemctl enable sherlock-cron
sudo systemctl start sherlock-cron
sudo systemctl status sherlock-cron
```

## Références

- Service de cache: [app/services/protocol-cache.service.ts](../app/services/protocol-cache.service.ts)
- Service cron: [app/services/cron.service.ts](../app/services/cron.service.ts)
- Worker: [scripts/cron-worker.ts](../scripts/cron-worker.ts)
- Init: [scripts/init-cron.ts](../scripts/init-cron.ts)
