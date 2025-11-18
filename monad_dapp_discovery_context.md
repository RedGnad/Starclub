# Context: Monad Testnet dApp Discovery Tool (Using BlockVision Indexing API)

## 1. Overview

Ce document sert de référence technique pour la construction d'un outil de découverte de dApps sur la chaîne **Monad Testnet**, utilisant **BlockVision – Monad Indexing API** comme source principale de données.

L'objectif est de :

- Collecter automatiquement les nouveaux contrats déployés sur le réseau.
- Identifier et classifier les dApps actives.
- Récupérer les interactions (transactions, logs, événements).
- Suivre l'activité des utilisateurs.
- Construire une API interne + une interface web de découverte.

---

## 2. Technologies et Environnement

### 2.1 Stack recommandée

- **Backend** : TypeScript / Node.js
- **Base de données** : Prisma
- **API** : REST
- **Frontend** : react-router
- **Indexing provider** : BlockVision Monad Indexing API

### 2.2 Réseau ciblé

- **Network** : Monad Testnet
- **Chain ID** : _à confirmer en utilisant BlockVision_ (ex. testnet identifiers)

---

## 3. BlockVision – Monad Indexing API

### 3.1 Base URLs

- Base BlockVision API : `https://api.blockvision.org/v1` (exemple, à confirmer dans implémentation)
- Namespace Monad testnet : `/monad/testnet/...`

### 3.2 Endpoints pertinents

#### ✅ 1. **Account Transactions API**

Permet de suivre l'activité d'une adresse.

- Récupérer : interactions, transactions entrantes/sortantes.
- Usage pour : mesurer activité de dApps.

#### ✅ 2. **Account Tokens API**

Permet de récupérer les tokens associés à une adresse.

- Utile pour identifier contrats ERC20/721/1155.

#### ✅ 3. **Contract Events API**

Permet de lire les logs / events d’un smart contract.

- Crucial pour analyser dApps : swap, mint, burn, transfer.

#### ✅ 4. **Transaction Receipt API**

Permet de confirmer un déploiement de contrat.

- Sert à construire le module de découverte automatique.

#### ✅ 5. **Block / Logs Search API**

Permet de scanner tout le réseau pour :

- découvrir les nouveaux contrats
- indexer les événements
- détecter des patterns de dApp (DEX, NFT, Game)

---

## 4. Fonctionnalités du Discovery Tool

### 4.1 Module de détection de nouveaux contrats

- Surveillance des blocks récents.
- Extraction des transactions de type `contract creation`.
- Enrichissement : vérification de bytecode → classification.

### 4.2 Module de classification des dApps

Pour chaque contrat identifié :

- Lire ABI si disponible (via explorer / heuristiques).
- Inspecter les événements émis.
- Déduire catégorie :
  - DeFi (swap, liquidity)
  - NFT (mint, transfer)
  - GameFi
  - Social
  - Bridge
  - Infra

### 4.3 Module d’activité

- Compter : tx/jour, utilisateurs uniques, events.
- Détecter pics d’activité.
- Déterminer status : actif / dormant.

### 4.4 Stockage

Tables suggérées :

#### Table: `dapps`

- id
- nom (optionnel)
- adresse(s) de contrat
- catégorie
- description
- date_creation
- source_detection (auto / manuel)

#### Table: `contracts`

- id
- dapp_id
- address
- bytecode_hash
- type (ERC20/NFT/custom)
- date_deployment

#### Table: `activity`

- id
- dapp_id
- date
- tx_count
- user_count
- event_count

---

## 5. Pipeline d’Ingestion (cron)

### Toutes les 2 minutes :

- scan du dernier block
- détecter nouveaux contrats

### Toutes les 10 minutes :

- analyse d’activité des dApps

### Toutes les 24h :

- nettoyage, recalcul global
- mise à jour des métadonnées

---

## 6. API interne (backend)

Endpoints proposés :

```
GET /dapps
GET /dapps/{id}
GET /dapps?category=defi&sort=activity

GET /contracts/{address}
GET /activity/{dapp_id}
```

---

## 7. Interface Utilisateur (Frontend)

Fonctionnalités :

- Liste complète des dApps
- Filtres : catégorie, activité, date
- Page individu dApp : contrats, activité, logs
- Indicateur "Trending" basé sur activité 24h

---

## 8. Architecture globale

1. **Data ingestion service** (Node.js + BlockVision API)
2. **Database** (PostgreSQL)
3. **API** (NestJS ou Express)
4. **Frontend** (Next.js)
5. **Workers cron** (BullMQ / CronJobs)

---

## 9. Points critiques

- Gestion du rate‑limit BlockVision
- Détection précise des contrats utiles vs bruit de testnet
- Classification automatique à améliorer avec heuristiques
- Optimisation du scan de blocks

---

## 10. Prochaines étapes

1. Ajouter les URL exactes des endpoints BlockVision
2. Ajouter les schémas de réponse JSON
3. Construire la première version du module "Scan Blocks"
4. Mettre en place la base de données
