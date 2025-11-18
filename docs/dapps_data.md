# Système de Récupération des Données des dApps

## Vue d'ensemble

Ce document décrit le système complet de synchronisation et d'affichage des dApps depuis Monvision, incluant :
- Scraping des dApps depuis Monvision
- Enrichissement des données (contrats, followers Twitter)
- Détection des interactions utilisateur via HyperSync
- Mise en cache et affichage dans l'UI

---

## Architecture du Système

```
┌─────────────────┐
│  DappsContext   │  ← Gère l'état global et la synchronisation
└────────┬────────┘
         │
         ├─→ [GET] /api/dapps           → Charge les dApps depuis la DB
         ├─→ [POST] /api/dapps/sync     → Lance la synchronisation
         └─→ [GET] /api/user/interactions → Récupère les interactions utilisateur
              │
              ├─→ Monvision Scraper      (scraping des projets)
              ├─→ Twitter Scraper         (followers)
              └─→ UserInteractionsService (HyperSync)
```

---

## 1. Affichage Initial des dApps

### Source des Données
Les dApps sont affichées depuis :
1. **Base de données** (`MonvisionDApp` table) en priorité
2. Si la table est vide, affichage d'un message invitant à synchroniser

### Endpoint d'Affichage
**GET** `/api/dapps/index.ts`

```typescript
// Charge toutes les dApps avec leurs contrats
const dapps = await prisma.monvisionDApp.findMany({
  include: { contracts: true },
  orderBy: { name: "asc" }
});
```

**Données retournées** :
- Informations de base (nom, logo, description, catégorie)
- Liens sociaux (Twitter, Discord, Telegram, GitHub, website)
- Métriques (nombre de comptes, transactions, contracts)
- Statut d'enrichissement (`isEnriched`)
- Nombre de followers Twitter (`twitterFollowers`)

---

## 2. Synchronisation des dApps

### Déclenchement
La synchronisation se déclenche au **clic sur le bouton "Synchroniser"** dans l'UI.

### Workflow de Synchronisation

#### Étape 1 : Scraping des Projets Monvision
**Page cible** : https://testnet.monvision.io/ecosystem
**Onglet** : "All Projects"

**Action** : Scraper crée ou met à jour dans `MonvisionDApp`
- Nom du projet
- Logo
- URL de la page de détails
- Catégorie (type de projet : Dex, Lending, LST, etc.)
- Description
- **Liens sociaux** (Twitter, Discord, Telegram, GitHub, Website, Docs)
- **Métriques** (nombre de comptes, transactions)

**Code implémenté** : [app/lib/scraper/monvision-complete.ts](app/lib/scraper/monvision-complete.ts)

```typescript
// Scrape tous les projets depuis l'ecosystem page
const scrapedDapps = await scrapeMonvisionComplete();

// Pour chaque projet, visite la page détails pour récupérer :
// - Liens sociaux (Twitter, Discord, Telegram, GitHub, Website, Docs)
// - Métriques (accountsCount, transactionsCount)
// - Contrats (depuis l'onglet Contracts)
```

**Sauvegarde en base** :
```typescript
await prisma.monvisionDApp.upsert({
  where: { name: project.name },
  create: {
    name: project.name,
    logoUrl: project.logoUrl,
    category: project.category,
    detailsUrl: project.detailsUrl,
    description: project.description,
    website: project.website,
    twitter: project.twitter,
    discord: project.discord,
    telegram: project.telegram,
    github: project.github,
    docs: project.docs,
    accountsCount: project.accountsCount,
    transactionsCount: project.transactionsCount,
    isEnriched: true, // Enrichi avec liens sociaux et contrats
    enrichedAt: new Date()
  },
  update: {
    logoUrl: project.logoUrl,
    category: project.category,
    website: project.website,
    twitter: project.twitter,
    discord: project.discord,
    telegram: project.telegram,
    github: project.github,
    docs: project.docs,
    accountsCount: project.accountsCount,
    transactionsCount: project.transactionsCount,
    isEnriched: true,
    enrichedAt: new Date()
  }
});
```

#### Étape 2 : Scraping des Contrats
**Automatique** : Déjà fait dans l'étape 1 lors de la visite de la page détails

**Action** : Aller dans l'onglet "Contracts" et extraire les adresses

**Code implémenté** : [app/lib/scraper/monvision-complete.ts](app/lib/scraper/monvision-complete.ts)

Le scraper complet visite automatiquement chaque page projet et clique sur l'onglet "Contracts" pour extraire les contrats.

**Sauvegarde en base** :
```typescript
// Pour chaque contrat trouvé
for (const contract of contracts) {
  await prisma.monvisionContract.upsert({
    where: { dappId_address: { dappId, address: contract.address } },
    create: {
      dappId,
      address: contract.address,
      name: contract.name,
      type: contract.type
    },
    update: {
      name: contract.name,
      type: contract.type
    }
  });
}

// Marquer la dApp comme enrichie
await prisma.monvisionDApp.update({
  where: { id: dappId },
  data: {
    isEnriched: true,
    enrichedAt: new Date()
  }
});
```

#### Étape 3 : Scraping des Followers Twitter
**Pour chaque dApp** : Si un lien Twitter existe

**Action** : Visiter le profil Twitter et extraire le nombre de followers

**Code existant** : [app/lib/scraper/twitter.ts:214](app/lib/scraper/twitter.ts#L214)
```typescript
export async function scrapeTwitterFollowers(
  accounts: string[],
  batchSize: number = 5,
  delayBetweenBatches: number = 1500
): Promise<ScraperResult[]>
```

**Sauvegarde en base** :
```typescript
// Après avoir scrapé les followers
for (const result of twitterResults) {
  if (result.success && result.followersCount) {
    await prisma.monvisionDApp.update({
      where: { twitter: `https://x.com/${result.username}` },
      data: { twitterFollowers: result.followersCount }
    });
  }
}
```

---

## 3. Détection des Interactions Utilisateur

### Qu'est-ce que HyperSync ?
HyperSync est un service d'indexation blockchain qui permet de :
- Récupérer **toutes les transactions** d'une adresse utilisateur
- Récupérer **tous les logs/événements** impliquant une adresse
- Faire des requêtes sur des plages de blocs spécifiques

### Workflow de Détection

#### Étape 1 : Récupération de l'Adresse Wallet
L'adresse du wallet utilisateur est fournie par :
- Connexion Web3 (MetaMask, WalletConnect, etc.)
- Paramètre dans l'URL
- Stockage local (localStorage)

#### Étape 2 : Requête HyperSync
**Service** : [app/services/user-interactions.service.ts](app/services/user-interactions.service.ts)

**Méthode principale** :
```typescript
async detectUserDappInteractions(
  userAddress: string,
  fromBlock?: number,
  toBlock?: number
): Promise<UserInteractionSummary>
```

**Processus** :
1. Récupérer tous les contrats des dApps depuis la DB
2. Faire 3 requêtes HyperSync en parallèle :
   - Transactions envoyées par l'utilisateur (`from: userAddress`)
   - Logs où l'utilisateur apparaît dans les topics
   - Logs de tous les contrats dApps (pour détecter l'utilisateur dans le `data` field)

3. Matcher les résultats avec les contrats des dApps

**Code** :
```typescript
// 1. Récupérer les contrats
const dappContracts = await prisma.contract.findMany({
  where: { dappId: { not: null } },
  select: { address: true, dappId: true, dapp: { select: { id: true, name: true } } }
});

// 2. Requête HyperSync pour les transactions
const query: HyperSyncQuery = {
  from_block: fromBlock,
  to_block: toBlock,
  transactions: [{ from: [userAddress.toLowerCase()] }],
  field_selection: {
    transaction: ['from', 'to', 'hash', 'block_number', 'gas_used']
  }
};

// 3. Matcher avec les contrats
for (const tx of userTransactions) {
  const toAddress = tx.to?.toLowerCase();
  const dappContract = contractIndex.get(toAddress);

  if (dappContract && dappContract.dapp) {
    // L'utilisateur a interagi avec cette dApp !
    interactions.push({
      dappId: dappContract.dappId,
      transactionCount: ...,
      // ...
    });
  }
}
```

#### Étape 3 : Cache des Interactions
Les interactions sont mises en cache **localement** (pas en DB) pour éviter de refaire la requête HyperSync à chaque chargement.

**Stockage** : `localStorage` dans le navigateur
```typescript
// Après détection
localStorage.setItem(
  `user_interactions_${userAddress}`,
  JSON.stringify({
    dappIds: interactedDappIds,
    transactionCounts: { [dappId]: count, ... },
    timestamp: Date.now()
  })
);
```

**Invalidation du cache** :
- Lors d'une nouvelle synchronisation des dApps
- Après 24 heures (cache expiré)

#### Étape 4 : Re-vérification lors de la Synchronisation
Lors d'une synchro complète, le système :
1. Récupère les nouvelles dApps et leurs contrats
2. Re-vérifie les interactions avec les nouveaux contrats
3. Met à jour le cache local

---

## 4. Affichage dans l'UI

### Composant DappCard
[app/components/DappCard.tsx](app/components/DappCard.tsx)

**Props** :
```typescript
interface DappCardProps {
  dapp: DApp;
  index: number;
  hasUserInteracted?: boolean; // ← Indique si l'utilisateur a interagi
}
```

### Badge d'Interaction
**Affichage** : Puce verte en haut à droite de la carte si `hasUserInteracted = true`

**Code** : [app/components/DappCard.tsx:152-171](app/components/DappCard.tsx#L152-L171)
```tsx
{hasUserInteracted && dapp.isEnriched && (
  <div className="absolute top-2 right-2 z-20">
    <div className="flex items-center gap-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-full px-3 py-1.5">
      <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <span className="text-xs font-semibold text-green-300">Utilisé</span>
    </div>
  </div>
)}
```

### TODO : Afficher le Nombre de Transactions
**Objectif** : Afficher le nombre de transactions de l'utilisateur avec la dApp

**Modification à apporter** :
```tsx
// Passer le nombre de transactions dans les props
interface DappCardProps {
  dapp: DApp;
  index: number;
  hasUserInteracted?: boolean;
  transactionCount?: number; // ← NOUVEAU
}

// Affichage dans le badge
{hasUserInteracted && dapp.isEnriched && (
  <div className="flex items-center gap-1.5 ...">
    <svg ... />
    <span className="text-xs font-semibold text-green-300">
      {transactionCount ? `${transactionCount} tx` : 'Utilisé'}
    </span>
  </div>
)}
```

---

## 5. Structure de la Base de Données

### Table MonvisionDApp
```prisma
model MonvisionDApp {
  id                String   @id @default(cuid())
  name              String
  description       String?
  logoUrl           String?
  category          String?

  // Liens sociaux
  website           String?
  twitter           String?
  discord           String?
  telegram          String?
  github            String?
  docs              String?
  detailsUrl        String?  // URL Monvision

  // Métriques
  twitterFollowers  String?  // Ex: "12 k", "2 552"
  accountsCount     Int      @default(0)
  transactionsCount BigInt   @default(0)

  // Enrichissement
  isEnriched        Boolean  @default(false)
  enrichedAt        DateTime?

  // Relations
  contracts         MonvisionContract[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@map("monvision_dapps")
}
```

### Table MonvisionContract
```prisma
model MonvisionContract {
  id        String   @id @default(cuid())
  address   String
  name      String?
  type      String?

  // Relation
  dappId    String
  dapp      MonvisionDApp @relation(fields: [dappId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([dappId, address])
  @@map("monvision_contracts")
}
```

---

## 6. API Endpoints

### GET /api/dapps
**Fonction** : Charge toutes les dApps depuis la DB
**Retour** : Liste des dApps avec leurs contrats

### POST /api/dapps/sync
**Fonction** : Lance le scraping rapide (nom, logo, URL uniquement)
**Processus** : Scrape Monvision → Sauvegarde en DB (non enrichi)

### POST /api/dapps/sync-complete
**Fonction** : Lance la synchronisation complète (scraping + enrichissement + Twitter)
**Processus** :
1. Scrape Monvision (tous les projets)
2. Pour chaque projet : scrape les contrats
3. Pour chaque projet : scrape les followers Twitter
4. Sauvegarde progressive en DB

### GET /api/user/interactions
**Paramètres** :
- `address` (required) : Adresse Ethereum de l'utilisateur
- `fromBlock` (optional) : Bloc de départ
- `toBlock` (optional) : Bloc de fin

**Fonction** : Détecte les interactions de l'utilisateur avec les dApps
**Retour** :
```json
{
  "success": true,
  "userAddress": "0x123...",
  "interactedDappIds": ["dapp1", "dapp2"],
  "totalInteractions": 2
}
```

---

## 7. Contexte React (State Management)

### DappsContext
[app/contexts/DappsContext.tsx](app/contexts/DappsContext.tsx)

**État géré** :
```typescript
{
  dapps: DApp[],                    // Liste des dApps
  loading: boolean,                 // Chargement en cours
  error: string | null,             // Erreur éventuelle
  syncMessage: string,              // Message de progression
  userInteractedDappIds: string[],  // IDs des dApps avec lesquelles l'utilisateur a interagi
}
```

**Méthodes** :
```typescript
syncDapps(): Promise<void>
  → Lance la synchronisation complète
  → Démarre le polling automatique (auto-refresh toutes les 2s)
  → S'arrête automatiquement quand les compteurs se stabilisent

loadUserInteractions(userAddress: string): Promise<void>
  → Charge les interactions de l'utilisateur
  → Met à jour userInteractedDappIds
```

---

## 8. Flux Complet de Synchronisation

```
1. User clique sur "Synchroniser"
   ↓
2. POST /api/dapps/sync-complete
   ↓
3. Scraping Monvision (page ecosystem)
   ├─ Récupère tous les projets dans "All Projects"
   ├─ Sauvegarde en DB (isEnriched: false)
   └─ Pour chaque projet :
       ├─ Visite la page détails
       ├─ Scrape l'onglet "Contracts"
       ├─ Sauvegarde les contrats en DB
       ├─ Marque isEnriched: true
       ├─ Si Twitter présent :
       │   ├─ Scrape les followers
       │   └─ Sauvegarde en DB
       └─ Continue au projet suivant
   ↓
4. Frontend : Auto-refresh toutes les 2s
   ├─ GET /api/dapps
   ├─ Affiche les nouveaux projets au fur et à mesure
   └─ S'arrête quand les compteurs se stabilisent (5x stable = arrêt)
   ↓
5. Si utilisateur connecté :
   ├─ GET /api/user/interactions?address=0x...
   ├─ HyperSync récupère toutes les transactions
   ├─ Compare avec les contrats des dApps
   ├─ Met en cache les interactions
   └─ Affiche les puces vertes sur les DappCards
```

---

## 9. Points d'Amélioration

### À Implémenter
1. **Scraper Monvision manquant**
   - Créer `app/lib/scraper/monvision.ts`
   - Implémenter `scrapeMonvisionProjects()`
   - Implémenter `enrichDappContracts(detailsUrl)`

2. **Affichage du nombre de transactions**
   - Modifier `DappCard` pour accepter `transactionCount`
   - Récupérer le nombre depuis `UserInteractionSummary`
   - Afficher dans le badge vert

3. **Optimisation HyperSync**
   - Mettre en cache les résultats en DB (table `UserInteraction`)
   - Éviter de refaire la requête complète à chaque fois
   - Implémenter une requête incrémentale (depuis le dernier bloc connu)

4. **Gestion des erreurs**
   - Retry automatique en cas d'échec de scraping
   - Notification utilisateur en cas d'erreur HyperSync
   - Fallback si Twitter rate-limit

---

## 10. Exemples de Code pour Implémentation

### Scraper la Page Ecosystem de Monvision
```typescript
// app/lib/scraper/monvision.ts
import puppeteer from "puppeteer";

export interface MonvisionProject {
  name: string;
  logoUrl: string | null;
  category: string | null;
  detailsUrl: string;
  description: string | null;
}

export async function scrapeMonvisionEcosystem(): Promise<MonvisionProject[]> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log("🔍 Navigating to Monvision Ecosystem...");
    await page.goto("https://testnet.monvision.io/ecosystem", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Attendre que la page charge
    await page.waitForSelector('button:has-text("All Projects")', { timeout: 10000 });

    // Cliquer sur l'onglet "All Projects"
    console.log("📂 Clicking 'All Projects' tab...");
    await page.click('button:has-text("All Projects")');
    await page.waitForTimeout(2000); // Attendre le chargement

    // Scraper les cartes de projets
    // NOTE : Les sélecteurs ci-dessous sont à adapter selon le DOM réel
    console.log("📊 Extracting projects...");
    const projects = await page.$$eval(".project-card", (cards) =>
      cards.map((card) => {
        const nameEl = card.querySelector(".project-name");
        const logoEl = card.querySelector("img");
        const categoryEl = card.querySelector(".project-type");
        const linkEl = card.querySelector("a");
        const descEl = card.querySelector(".description");

        return {
          name: nameEl?.textContent?.trim() || "",
          logoUrl: logoEl?.src || null,
          category: categoryEl?.textContent?.trim() || null,
          detailsUrl: linkEl?.href || "",
          description: descEl?.textContent?.trim() || null,
        };
      })
    );

    console.log(`✅ Found ${projects.length} projects`);
    return projects;
  } finally {
    await browser.close();
  }
}
```

### Enrichir avec les Contrats
```typescript
// app/lib/scraper/monvision-contracts.ts
export interface ContractInfo {
  address: string;
  name: string | null;
  type: string | null;
}

export async function scrapeProjectContracts(
  detailsUrl: string
): Promise<ContractInfo[]> {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`🔍 Visiting ${detailsUrl}...`);
    await page.goto(detailsUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Cliquer sur l'onglet "Contracts"
    await page.waitForSelector('button:has-text("Contracts")', { timeout: 10000 });
    await page.click('button:has-text("Contracts")');
    await page.waitForTimeout(2000);

    // Scraper les contrats
    const contracts = await page.$$eval(".contract-item", (items) =>
      items.map((item) => {
        const addressEl = item.querySelector(".contract-address");
        const nameEl = item.querySelector(".contract-name");
        const typeEl = item.querySelector(".contract-type");

        return {
          address: addressEl?.textContent?.trim() || "",
          name: nameEl?.textContent?.trim() || null,
          type: typeEl?.textContent?.trim() || null,
        };
      })
    );

    console.log(`✅ Found ${contracts.length} contracts`);
    return contracts;
  } finally {
    await browser.close();
  }
}
```

### Route de Synchronisation Complète
```typescript
// app/routes/api+/dapps+/sync-complete.ts
import { scrapeMonvisionEcosystem } from "~/lib/scraper/monvision";
import { scrapeProjectContracts } from "~/lib/scraper/monvision-contracts";
import { scrapeTwitterFollowers } from "~/lib/scraper/twitter";
import { prisma } from "~/lib/db/prisma";

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    console.log("🚀 Starting complete sync...");

    // 1. Scraper les projets Monvision
    const projects = await scrapeMonvisionEcosystem();

    // 2. Sauvegarder en DB (pas encore enrichi)
    for (const project of projects) {
      await prisma.monvisionDApp.upsert({
        where: { name: project.name },
        create: {
          name: project.name,
          logoUrl: project.logoUrl,
          category: project.category,
          detailsUrl: project.detailsUrl,
          description: project.description,
          isEnriched: false,
        },
        update: {
          logoUrl: project.logoUrl,
          category: project.category,
          detailsUrl: project.detailsUrl,
          description: project.description,
        },
      });
    }

    // 3. Enrichir chaque projet (en arrière-plan)
    // On peut lancer ça en background pour ne pas bloquer la réponse
    enrichProjectsInBackground();

    return Response.json({
      success: true,
      projectsFound: projects.length,
    });
  } catch (error) {
    console.error("Error during sync:", error);
    return Response.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
};

async function enrichProjectsInBackground() {
  const dapps = await prisma.monvisionDApp.findMany({
    where: { isEnriched: false },
  });

  for (const dapp of dapps) {
    try {
      // Scraper les contrats
      if (dapp.detailsUrl) {
        const contracts = await scrapeProjectContracts(dapp.detailsUrl);

        for (const contract of contracts) {
          await prisma.monvisionContract.upsert({
            where: {
              dappId_address: { dappId: dapp.id, address: contract.address },
            },
            create: {
              dappId: dapp.id,
              address: contract.address,
              name: contract.name,
              type: contract.type,
            },
            update: {
              name: contract.name,
              type: contract.type,
            },
          });
        }
      }

      // Scraper Twitter
      if (dapp.twitter) {
        const [result] = await scrapeTwitterFollowers([dapp.twitter]);
        if (result.success && result.followersCount) {
          await prisma.monvisionDApp.update({
            where: { id: dapp.id },
            data: { twitterFollowers: String(result.followersCount) },
          });
        }
      }

      // Marquer comme enrichi
      await prisma.monvisionDApp.update({
        where: { id: dapp.id },
        data: { isEnriched: true, enrichedAt: new Date() },
      });

      console.log(`✅ Enriched ${dapp.name}`);
    } catch (error) {
      console.error(`❌ Error enriching ${dapp.name}:`, error);
    }
  }

  console.log("🎉 Background enrichment complete");
}
```

---

## Conclusion

Ce système permet de :
1. ✅ Scraper automatiquement les dApps depuis Monvision
2. ✅ Enrichir progressivement avec les contrats et les followers Twitter
3. ✅ Détecter les interactions utilisateur via HyperSync
4. ✅ Afficher une puce sur les dApps déjà utilisées
5. 🔄 Afficher le nombre de transactions (à implémenter)

Le document sert de référence pour implémenter les parties manquantes et comprendre le flux complet du système.
