# Intégration Google Sheets

Ce document décrit l'intégration du Google Sheets Monad Ecosystem comme source de données complémentaires pour l'enrichissement des protocoles.

## Vue d'ensemble

Le système enrichit maintenant les données des protocoles GitHub avec des informations complémentaires provenant d'un Google Sheets communautaire qui référence plus de 500 projets de l'écosystème Monad.

## Source de données

**Google Sheet URL:** https://docs.google.com/spreadsheets/d/1LvM26stpFO7kJk4Y974NhLznjerMh6h8wvZBeYja26M/edit?gid=0#gid=0

### Colonnes du Google Sheet

1. **NAME** - Nom du projet
2. **LOGO** - URL du logo
3. **PJ TYPE** - Type de projet (App, Infra, App/Infra)
4. **TAGS** - Tags/catégories (DeFi, DEX, Gaming, NFT, etc.)
5. **X** - Handle Twitter
6. **WEB** - URL du site web
7. **BANNER** - URL de la bannière
8. **INFO** - Description du projet
9. **ONLY on Monad** - Si le projet est exclusif à Monad (Yes/No)
10. **🟥 = sus / website link broken / dead pjs** - Marquage des projets suspects ou cassés

## Flux d'enrichissement

L'enrichissement suit maintenant cet ordre :

```
1. Récupération des protocoles depuis GitHub (monad-crypto/protocols)
   ↓
2. Enrichissement avec Google Sheets
   - Logos
   - Websites
   - Twitter handles
   - Descriptions
   - Catégories/Tags
   ↓
3. Recherche de logo (si absent)
   - DefiLlama API
   - CoinGecko API
   - Génération par défaut (DiceBear)
   ↓
4. Enrichissement avec Envio HyperSync
   - Statistiques de transactions
   - Nombre d'utilisateurs uniques
   - Événements blockchain
   - Score d'activité
   ↓
5. Affichage progressif et sauvegarde en base de données
```

## Service GoogleSheetsService

### Emplacement
`app/services/google-sheets.service.ts`

### Méthodes principales

#### `fetchProtocols(): Promise<GoogleSheetsProtocol[]>`
Récupère toutes les données depuis Google Sheets en CSV.

```typescript
const protocols = await googleSheetsService.fetchProtocols();
// Retourne un tableau de GoogleSheetsProtocol
```

#### `findByName(protocols, name): GoogleSheetsProtocol | undefined`
Trouve un protocole par nom (recherche insensible à la casse avec fuzzy matching).

```typescript
const sheetsInfo = googleSheetsService.findByName(protocols, 'Uniswap');
```

### Interface GoogleSheetsProtocol

```typescript
interface GoogleSheetsProtocol {
  name: string;
  logo?: string;
  projectType?: string; // 'App', 'Infra', 'App/Infra'
  tags?: string[]; // ['DeFi', 'DEX', 'Gaming', etc.]
  twitter?: string;
  website?: string;
  banner?: string;
  description?: string;
  monadOnly?: boolean;
  suspicious?: boolean; // Marqué comme suspect/cassé
}
```

## Intégration dans ProtocolEnrichmentService

Le service d'enrichissement charge automatiquement les données Google Sheets lors de l'enrichissement d'un protocole :

```typescript
// Dans enrichProtocol()
const googleSheetsData = await this.getGoogleSheetsData(); // Chargé une seule fois et mis en cache
const sheetsInfo = googleSheetsService.findByName(googleSheetsData, protocol.name);

if (sheetsInfo) {
  // Enrichir avec les données Google Sheets
  if (sheetsInfo.logo && !protocol.logo) {
    protocol.logo = sheetsInfo.logo;
  }
  if (sheetsInfo.website && !protocol.website) {
    protocol.website = sheetsInfo.website;
  }
  // etc.
}
```

### Priorité des données

Les données sont enrichies dans l'ordre de priorité suivant :

1. **Données GitHub** (repository monad-crypto/protocols) - Base de référence
2. **Google Sheets** - Complète les données manquantes
3. **APIs externes** (DefiLlama, CoinGecko) - Uniquement pour les logos si absent

## Affichage dans l'interface

Les dApps affichent maintenant tous les liens disponibles :

- **Website** (icône globe bleu)
- **GitHub** (icône GitHub gris)
- **Twitter** (icône X/Twitter bleu ciel)

```typescript
interface DiscoveredDApp {
  // ...
  website?: string;
  github?: string;
  twitter?: string;
  // ...
}
```

## Recherche fuzzy

Le service utilise une recherche intelligente pour matcher les noms :

1. **Recherche exacte** : `"Uniswap" === "Uniswap"`
2. **Recherche partielle** : `"Uniswap" contains "Uni"`
3. **Recherche normalisée** : `"Uni Swap" === "UniSwap"` (ignore espaces, tirets, underscores)

## Cache

Les données Google Sheets sont chargées **une seule fois** par session d'enrichissement et mises en cache en mémoire dans `ProtocolEnrichmentService.googleSheetsCache`.

## Marquage des projets suspects

Si un projet est marqué comme suspect dans Google Sheets (colonne 🟥), un avertissement est affiché dans les logs :

```
  ⚠️ Marqué comme suspect/cassé dans Google Sheets
```

Le drapeau `suspicious` est disponible dans `GoogleSheetsProtocol` pour un filtrage ultérieur si nécessaire.

## Utilisation

### Lancer l'enrichissement avec Google Sheets

```bash
# Via le bouton "Enrichir les protocoles" dans l'interface DiscoveryModal
# Ou via CLI:
npm run cron:enrich
```

L'enrichissement se fait automatiquement en streaming via SSE :

```
📥 Récupération des données Google Sheets...
📊 500+ projets trouvés dans Google Sheets
✓ 450 protocoles valides parsés

🔍 Enrichissement de Uniswap...
  📋 Données Google Sheets trouvées pour Uniswap
     Logo: https://...
     Website: https://uniswap.org
     Twitter: https://twitter.com/Uniswap
```

## Maintenance

Le Google Sheet est maintenu par la communauté Monad. Pour mettre à jour la source :

1. Modifier `SHEET_ID` dans `google-sheets.service.ts` :

```typescript
private readonly SHEET_ID = '1LvM26stpFO7kJk4Y974NhLznjerMh6h8wvZBeYja26M';
```

2. Vérifier que le sheet est **publiquement accessible** (export CSV autorisé)

## Dépendances

- **papaparse** (^5.5.3) - Parser CSV
- **@types/papaparse** (^5.5.0) - Types TypeScript

```bash
yarn add papaparse
yarn add -D @types/papaparse
```

## Exemple complet

```typescript
import { googleSheetsService } from '~/services/google-sheets.service';

// Récupérer toutes les données
const protocols = await googleSheetsService.fetchProtocols();
console.log(`${protocols.length} protocoles chargés`);

// Rechercher un protocole spécifique
const uniswap = googleSheetsService.findByName(protocols, 'Uniswap');
if (uniswap) {
  console.log(`Logo: ${uniswap.logo}`);
  console.log(`Website: ${uniswap.website}`);
  console.log(`Twitter: ${uniswap.twitter}`);
  console.log(`Tags: ${uniswap.tags?.join(', ')}`);
  console.log(`Monad-only: ${uniswap.monadOnly ? 'Yes' : 'No'}`);
}
```

## Références

- Service: [app/services/google-sheets.service.ts](../app/services/google-sheets.service.ts)
- Integration: [app/services/protocol-enrichment.service.ts](../app/services/protocol-enrichment.service.ts)
- UI: [app/components/DiscoveryModal.tsx](../app/components/DiscoveryModal.tsx)
- Google Sheet: [Monad Ecosystem Directory](https://docs.google.com/spreadsheets/d/1LvM26stpFO7kJk4Y974NhLznjerMh6h8wvZBeYja26M/edit?gid=0#gid=0)
