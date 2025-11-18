# Sherlock - Monad Testnet dApp Discovery Tool

Sherlock est un outil de découverte et d'analyse de dApps pour le réseau Monad Testnet. Il utilise Envio HyperSync pour scanner, classifier et suivre automatiquement les applications décentralisées déployées sur le réseau avec une vitesse 10,000x supérieure aux RPC traditionnels.

## Fonctionnalités

### 🔍 Détection Automatique
- Scan continu des nouveaux blocs pour détecter les déploiements de contrats
- Identification automatique des types de contrats (ERC20, ERC721, ERC1155)
- Enregistrement des métadonnées de déploiement

### 🏷️ Classification Intelligente
- Classification automatique des dApps par catégorie (DeFi, NFT, GameFi, Social, Bridge, Infra)
- Analyse des événements et signatures de fonctions
- Regroupement de contrats liés au sein de la même dApp

### 📊 Suivi d'Activité
- Tracking quotidien des transactions, utilisateurs et événements
- Calcul de métriques (txs/jour, utilisateurs uniques, gas utilisé)
- Détermination du statut (Active, Dormant, Inactive)

### 🎨 Interface Web
- Dashboard avec statistiques globales
- Liste des dApps avec filtres (catégorie, statut, recherche)
- Pages de détails avec graphiques d'activité
- Vue des contrats associés à chaque dApp

### 🔄 Pipeline d'Ingestion
- **Toutes les 2 minutes**: Scan des nouveaux blocs
- **Toutes les 5 minutes**: Classification des contrats
- **Toutes les 10 minutes**: Mise à jour de l'activité
- **Tous les jours**: Nettoyage et recalcul des statistiques

## Stack Technique

- **Frontend**: React Router, TypeScript, Tailwind CSS
- **Backend**: Node.js, TypeScript
- **Base de données**: SQLite avec Prisma ORM
- **Indexer**: Envio HyperSync (10,000x plus rapide que les RPC traditionnels)
- **Automation**: node-cron pour les tâches planifiées

## Installation

### Prérequis

- Node.js 18+
- Yarn ou npm

**Note:** Ce projet utilise SQLite, aucune installation de base de données n'est nécessaire ! 🎉

### Configuration

1. **Installer les dépendances**
```bash
yarn install
```

2. **Configurer les variables d'environnement**

Copier le fichier `.env.example` vers `.env` et remplir les valeurs :

```bash
cp .env.example .env
```

Variables importantes :
- `ENVIO_HYPERSYNC_URL`: URL de l'API Envio HyperSync (défaut: https://monad-testnet.hypersync.xyz)
- `MONAD_CHAIN_ID`: Identifiant de la chaîne (monad-testnet)

**Note**: Pas besoin de clé API - Envio HyperSync est gratuit et open-source ! 🎉

3. **Initialiser la base de données**

```bash
# Générer le client Prisma
npx prisma generate

# Créer la base de données SQLite et les tables
npx prisma db push

# (Optionnel) Ouvrir Prisma Studio pour visualiser les données
npx prisma studio
```

La base de données SQLite sera créée automatiquement dans `prisma/dev.db`.

4. **Démarrer le serveur de développement**

```bash
yarn dev
```

L'application sera accessible sur `http://localhost:5173`

## Structure du Projet

```
app/
├── services/                    # Services backend
│   ├── envio.service.ts        # Client Envio HyperSync
│   ├── contract-detector.service.ts  # Détection de contrats
│   ├── discovery-scanner.service.ts  # Scanner de découverte
│   └── cron.service.ts         # Gestion des tâches cron
├── routes/                     # Routes API et pages
│   ├── api.dapps.ts           # GET /api/dapps
│   ├── api.dapps.$id.ts       # GET /api/dapps/:id
│   ├── api.contracts.$address.ts # GET /api/contracts/:address
│   ├── api.activity.$dappId.ts  # GET /api/activity/:dappId
│   ├── api.stats.ts           # GET /api/stats
│   ├── api.admin.cron.ts      # POST /api/admin/cron
│   ├── dashboard.tsx          # Page dashboard
│   ├── dapps.tsx              # Liste des dApps
│   └── dapps.$id.tsx          # Détails d'une dApp
├── lib/
│   └── db/
│       └── prisma.ts          # Client Prisma
└── types/
    └── envio.ts               # Types TypeScript pour Envio

prisma/
└── schema.prisma              # Schéma de base de données
```

## API Endpoints

### Endpoints Publics

#### `GET /api/dapps`
Liste toutes les dApps avec pagination et filtres.

**Query params:**
- `category`: Filtrer par catégorie (DEFI, NFT, GAMEFI, etc.)
- `status`: Filtrer par statut (ACTIVE, DORMANT, INACTIVE)
- `search`: Recherche par nom ou adresse
- `page`: Numéro de page (défaut: 1)
- `pageSize`: Taille de page (défaut: 20)
- `sort`: Tri (createdAt, updatedAt, activity)
- `order`: Ordre (asc, desc)

**Exemple:**
```bash
GET /api/dapps?category=DEFI&status=ACTIVE&page=1&pageSize=10
```

#### `GET /api/dapps/:id`
Détails d'une dApp spécifique avec statistiques.

#### `GET /api/contracts/:address`
Informations sur un contrat spécifique.

#### `GET /api/activity/:dappId`
Historique d'activité d'une dApp.

**Query params:**
- `days`: Nombre de jours (défaut: 30)

#### `GET /api/stats`
Statistiques globales du réseau.

### Endpoints Admin

#### `GET /api/admin/cron`
Statut des tâches cron.

#### `POST /api/admin/cron`
Exécution manuelle des tâches cron.

**Actions:**
- `scan-blocks`: Scanner les blocs
- `classify-contracts`: Classifier les contrats
- `update-activity`: Mettre à jour l'activité
- `start-all`: Démarrer tous les cron jobs
- `stop-all`: Arrêter tous les cron jobs

**Exemple:**
```bash
curl -X POST /api/admin/cron \
  -d "action=scan-blocks"
```

## Modèle de Données

### DApp
- Informations générales (nom, description)
- Catégorie (DEFI, NFT, GAMEFI, SOCIAL, BRIDGE, INFRA, UNKNOWN)
- Statut (ACTIVE, DORMANT, INACTIVE)
- Source de détection (AUTO, MANUAL)

### Contract
- Adresse unique
- Type (ERC20, ERC721, ERC1155, CUSTOM, UNKNOWN)
- Métadonnées de déploiement
- Relation avec une dApp

### Activity
- Métriques quotidiennes par dApp
- Nombre de transactions
- Utilisateurs uniques
- Événements
- Gas utilisé

### BlockScanState
- Suivi du dernier bloc scanné
- Permet la reprise après interruption

## Personnalisation

### Ajouter de Nouvelles Catégories

1. Modifier `prisma/schema.prisma`:
```prisma
enum DAppCategory {
  DEFI
  NFT
  GAMEFI
  // ... ajouter votre catégorie
  MY_CATEGORY
}
```

2. Mettre à jour la base de données:
```bash
npx prisma db push
```

3. Ajouter la logique de détection dans `app/services/dapp-classifier.service.ts`

### Personnaliser les Cron Jobs

Modifier les schedules dans `app/services/cron.service.ts`:

```typescript
// Exemple: scanner toutes les 5 minutes au lieu de 2
const blockScannerJob = cron.schedule('*/5 * * * *', async () => {
  // ...
});
```

## Production

### Build

```bash
yarn build
```

### Démarrer en production

```bash
yarn start
```

### Variables d'environnement de production

- Désactiver les logs Prisma en production
- Configurer `NODE_ENV=production`
- Utiliser une base de données PostgreSQL robuste
- Configurer des secrets sécurisés pour les API keys

## Troubleshooting

### Problème de connexion à Envio HyperSync

Vérifier:
- L'URL HyperSync est correcte (`https://monad-testnet.hypersync.xyz`)
- La connexion internet est stable
- Consulter les logs pour plus de détails

### Base de données non synchronisée

```bash
npx prisma db push --force-reset
```

⚠️ **Attention**: Cette commande supprime toutes les données.

### Cron jobs ne s'exécutent pas

Vérifier:
- Les variables d'environnement `ENABLE_BLOCK_SCANNER` et `ENABLE_ACTIVITY_TRACKER`
- Les logs de la console pour les erreurs
- L'état des jobs via `/api/admin/cron`

## Améliorations Futures

- [ ] Ajouter plus de signatures d'événements pour une meilleure classification
- [ ] Implémenter un cache Redis pour les requêtes fréquentes
- [ ] Ajouter des webhooks pour notifier les nouvelles dApps
- [ ] Créer un système de tags personnalisés
- [ ] Implémenter une recherche full-text avec ElasticSearch
- [ ] Ajouter des graphiques interactifs avec Chart.js
- [ ] Support multi-chaîne (mainnet, autres testnets)

## Licence

MIT

## Support

Pour toute question ou problème, ouvrir une issue sur GitHub.
