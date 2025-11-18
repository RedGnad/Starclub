# Gestion des contrats connus

## Vue d'ensemble

Le système d'identification de dApps utilise plusieurs sources pour reconnaître automatiquement les dApps connues :

1. **Base locale** : Fichier JSON avec les contrats manuellement ajoutés
2. **Blockscout / Monad Explorer** : Tags et métadonnées officiels
3. **CoinGecko** : Base de données de crypto-monnaies
4. **DeFiLlama** : Protocoles DeFi référencés
5. **GitHub** : Recherche dans les dépôts open-source

---

## Sources d'identification

### 1. Base locale (priorité haute)

Fichier : `data/known-contracts.json`

Avantages :
- ✅ Contrôle total
- ✅ Aucune dépendance externe
- ✅ Instantané (pas de requête réseau)
- ✅ Confidence : 100%

Format :
```json
{
  "0xcontractaddress": {
    "name": "Nom de la dApp",
    "description": "Description détaillée",
    "logoUrl": "https://...",
    "website": "https://...",
    "category": "DEX",
    "tags": ["dex", "amm", "defi"],
    "confidence": 1.0,
    "source": "manual"
  }
}
```

### 2. Blockscout / Monad Explorer

URL : `https://testnet.monadexplorer.com/api`

Avantages :
- ✅ Source officielle
- ✅ Tags vérifiés
- ✅ Confidence : 80%

Limitations :
- ⚠️ Peut ne pas être disponible pour tous les testnets
- ⚠️ Dépend de la soumission manuelle

### 3. CoinGecko

URL : `https://api.coingecko.com/api/v3`

Avantages :
- ✅ Base de données exhaustive (10 000+ tokens)
- ✅ Logos de haute qualité
- ✅ Descriptions détaillées
- ✅ Confidence : 90%

Limitations :
- ⚠️ Rate limit : 50 requêtes/minute (gratuit)
- ⚠️ Ne supporte que les mainnet populaires
- ⚠️ Monad testnet non supporté (pour l'instant)

### 4. DeFiLlama

URL : `https://api.llama.fi`

Avantages :
- ✅ Focus sur DeFi
- ✅ TVL data disponible
- ✅ Multi-chain
- ✅ Confidence : 95%

Limitations :
- ⚠️ Seulement les protocoles DeFi
- ⚠️ Monad pas encore supporté

### 5. GitHub

URL : `https://api.github.com/search/code`

Avantages :
- ✅ Trouve les projets open-source
- ✅ Donne le lien vers le repo

Limitations :
- ⚠️ Rate limit très restrictif sans token (10/min)
- ⚠️ Confidence faible (60%)
- ⚠️ Pas toujours fiable

---

## Comment ajouter un contrat connu

### Méthode 1 : Via le fichier JSON (recommandé)

1. Éditer `data/known-contracts.json`
2. Ajouter l'entrée :

```json
{
  "0xYOUR_CONTRACT_ADDRESS": {
    "name": "MonadSwap",
    "description": "DEX automatisé sur Monad avec pools de liquidité",
    "logoUrl": "https://monadswap.com/logo.png",
    "website": "https://monadswap.com",
    "category": "DEX",
    "tags": ["dex", "amm", "swap", "liquidity"],
    "confidence": 1.0,
    "source": "manual"
  }
}
```

3. Sauvegarder et redémarrer le serveur

### Méthode 2 : Via l'API (programmatique)

```typescript
import { dappIdentificationService } from './app/services/dapp-identification.service';

dappIdentificationService.addKnownContract('0xabc123...', {
  name: 'MonadSwap',
  description: 'DEX on Monad',
  category: 'DEX',
  tags: ['dex', 'amm'],
  confidence: 1.0,
  source: 'manual',
});
```

### Méthode 3 : Export depuis la base de données

Si vous avez déjà des dApps identifiées dans Prisma :

```bash
npx tsx scripts/export-known-contracts.ts
```

Cela va créer/mettre à jour `data/known-contracts.json` avec toutes les dApps connues.

---

## Catégories supportées

```typescript
type Category =
  | 'DEX'              // Decentralized Exchange
  | 'LENDING'          // Lending/Borrowing
  | 'DEFI'             // DeFi générique
  | 'NFT'              // NFT collection
  | 'NFT_MARKETPLACE'  // NFT marketplace
  | 'GAMEFI'           // Gaming
  | 'SOCIAL'           // Social network
  | 'BRIDGE'           // Cross-chain bridge
  | 'INFRA'            // Infrastructure
  | 'GOVERNANCE'       // Governance/DAO
  | 'TOKEN'            // Simple token
  | 'UNKNOWN';         // Unknown
```

---

## Workflow d'identification

```
1. Contrat détecté (0xabc123...)
        ↓
2. Vérifier base locale (known-contracts.json)
   ✓ Trouvé → Confidence 100% → Fin
   ✗ Pas trouvé → Continuer
        ↓
3. Essayer Blockscout/Monad Explorer
   ✓ Trouvé → Confidence 80% → Fin
   ✗ Pas trouvé → Continuer
        ↓
4. Essayer CoinGecko
   ✓ Trouvé → Confidence 90% → Fin
   ✗ Pas trouvé → Continuer
        ↓
5. Essayer DeFiLlama
   ✓ Trouvé → Confidence 95% → Fin
   ✗ Pas trouvé → Continuer
        ↓
6. Essayer GitHub
   ✓ Trouvé → Confidence 60% → Fin
   ✗ Pas trouvé → Fin (Unknown)
```

---

## Priorité des sources

En cas de conflit (plusieurs sources donnent des infos différentes), l'ordre de priorité est :

1. **Base locale** (manual) - Confidence 100%
2. **DeFiLlama** - Confidence 95%
3. **CoinGecko** - Confidence 90%
4. **Blockscout** - Confidence 80%
5. **GitHub** - Confidence 60%

La source avec la plus haute confidence gagne.

---

## Exemples de contrats à ajouter

### DEX (Uniswap-like)

```json
{
  "0x...": {
    "name": "MonadSwap",
    "description": "Automated market maker (AMM) DEX on Monad",
    "logoUrl": "https://monadswap.com/logo.png",
    "website": "https://monadswap.com",
    "category": "DEX",
    "tags": ["dex", "amm", "swap", "liquidity", "uniswap"],
    "confidence": 1.0,
    "source": "manual"
  }
}
```

### Lending Protocol (Aave-like)

```json
{
  "0x...": {
    "name": "MonadLend",
    "description": "Decentralized lending and borrowing protocol",
    "logoUrl": "https://monadlend.com/logo.png",
    "website": "https://monadlend.com",
    "category": "LENDING",
    "tags": ["lending", "borrowing", "aave", "compound"],
    "confidence": 1.0,
    "source": "manual"
  }
}
```

### NFT Marketplace (OpenSea-like)

```json
{
  "0x...": {
    "name": "MonadSea",
    "description": "NFT marketplace for buying and selling digital assets",
    "logoUrl": "https://monadsea.com/logo.png",
    "website": "https://monadsea.com",
    "category": "NFT_MARKETPLACE",
    "tags": ["nft", "marketplace", "opensea", "art"],
    "confidence": 1.0,
    "source": "manual"
  }
}
```

---

## API de GitHub (optionnel)

Pour augmenter la rate limit GitHub, ajouter un token :

1. Créer un token : https://github.com/settings/tokens
2. Permissions : `public_repo` (read-only)
3. Ajouter dans `.env` :

```bash
GITHUB_TOKEN="ghp_your_token_here"
```

4. Cela augmente la rate limit de 10/min à 5000/min

---

## Contribution

Pour contribuer des contrats connus à la communauté Monad :

1. Fork le projet
2. Ajouter les contrats dans `data/known-contracts.json`
3. Vérifier les infos (nom, logo, website)
4. Submit une Pull Request

Format de PR :
```markdown
## Ajout de contrats connus

- MonadSwap (0xabc123...) - DEX
- MonadLend (0xdef456...) - Lending
- MonadNFT (0xghi789...) - NFT Marketplace

Tous les contrats ont été vérifiés et sont actifs sur Monad testnet.
```

---

## FAQ

### Q: Combien de contrats peut-on ajouter ?
**R:** Illimité. Le fichier JSON peut contenir des milliers d'entrées.

### Q: Le système fonctionne sans internet ?
**R:** Oui, avec la base locale. Les sources externes nécessitent une connexion.

### Q: Comment mettre à jour un contrat existant ?
**R:** Modifier `data/known-contracts.json` et redémarrer le serveur.

### Q: Peut-on avoir plusieurs contrats pour une même dApp ?
**R:** Oui, chaque contrat peut être identifié individuellement. Le grouping se fait ensuite par factory.

---

**Fait avec ❤️ pour la communauté Monad**
