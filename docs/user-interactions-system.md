# Système de Détection des Interactions Utilisateur

## 🎯 Vue d'ensemble

Le système détecte automatiquement quand un utilisateur a interagi avec des dApps sur Monad testnet et affiche un badge vert "Utilisé" sur les cartes correspondantes.

## 🔄 Flux Complet

### 1. Au chargement initial

```
Utilisateur ouvre la Discovery Modal
    ↓
loadUserInteractions(userAddress) est appelé
    ↓
API GET /api/user/interactions?address=0x...
    ↓
user-interactions.service.ts vérifie les transactions
    ↓
Compare avec 395 contrats (Contract + MonvisionContract tables)
    ↓
Retourne les IDs des dApps avec lesquelles l'utilisateur a interagi
    ↓
Badge vert "Utilisé" s'affiche sur les cartes
```

### 2. Lors de la synchronisation

```
Utilisateur clique sur "Synchroniser"
    ↓
syncDapps(userAddress) démarre
    ↓
Scraping Monvision (nouveaux projets, contrats, liens sociaux)
    ↓
Enrichissement Twitter (followers)
    ↓
Quand sync termine: Re-vérification automatique
    ↓
loadUserInteractions(userAddress) est rappelé
    ↓
Les badges se mettent à jour avec les nouvelles dApps
```

## 📁 Fichiers Clés

### Backend

1. **app/services/user-interactions.service.ts**
   - `detectUserDappInteractions()` : Vérifie les interactions avec toutes les dApps
   - `hasUserInteractedWithDapp()` : Vérifie une dApp spécifique
   - Requête les deux tables : `Contract` et `MonvisionContract`
   - Utilise HyperSync pour récupérer les transactions blockchain

2. **app/routes/api+/user+/interactions.ts**
   - Endpoint : `GET /api/user/interactions?address=0x...`
   - Retourne : `{ success: true, userAddress, interactedDappIds: [...], totalInteractions }`

3. **app/routes/api+/dapps+/index.ts**
   - Endpoint : `GET /api/dapps`
   - Retourne toutes les dApps avec le champ `isEnriched`

### Frontend

4. **app/contexts/DappsContext.tsx**
   - `loadUserInteractions()` : Charge les interactions utilisateur
   - `syncDapps(userAddress)` : Synchronise les dApps avec re-vérification auto
   - `refreshMetadata()` : Rafraîchit les métadonnées toutes les 5 minutes

5. **app/components/DiscoveryModal.tsx**
   - Appelle `loadUserInteractions()` quand la modal s'ouvre
   - Passe `userAddress` à `syncDapps()` pour la re-vérification
   - Affiche le compteur d'interactions : "X utilisée(s)"

6. **app/components/DappCard.tsx**
   - Badge "Utilisé" (lignes 151-171)
   - S'affiche si `hasUserInteracted && isEnriched`
   - Badge vert avec icône checkmark

## 🗄️ Base de Données

### Tables

- **monvision_dapps** : 166 dApps (toutes enrichies)
- **monvision_contracts** : 395 contrats
- **contracts** : 0 contrats (ancienne table, vide)

### Requêtes

```sql
-- Compter les contrats vérifiés
SELECT COUNT(*) FROM monvision_contracts; -- 395

-- Vérifier l'état d'enrichissement
SELECT COUNT(*), SUM(CASE WHEN isEnriched = 1 THEN 1 ELSE 0 END)
FROM monvision_dapps; -- 166 total, 166 enrichies

-- Nettoyer les contrats orphelins
DELETE FROM monvision_contracts
WHERE dappId NOT IN (SELECT id FROM monvision_dapps);
```

## 🎨 Badge "Utilisé"

### Conditions d'affichage

```typescript
hasUserInteracted && dapp.isEnriched
```

### Style

- **Position** : Top-right corner de la carte
- **Couleur** : Vert (gradient green-500/20 to emerald-500/20)
- **Icône** : Checkmark dans un cercle
- **Texte** : "Utilisé"
- **Effets** : Border, backdrop-blur, shadow

### Exemple de code

```tsx
{hasUserInteracted && dapp.isEnriched && (
  <div className="absolute top-2 right-2 z-20">
    <div className="flex items-center gap-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-full px-3 py-1.5 backdrop-blur-md shadow-lg">
      <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
      </svg>
      <span className="text-xs font-semibold text-green-300">Utilisé</span>
    </div>
  </div>
)}
```

## 🔧 Maintenance

### Problèmes résolus

1. ✅ **Contrats orphelins** : Nettoyés automatiquement (10 contrats supprimés)
2. ✅ **Double vérification** : Queries les deux tables (Contract + MonvisionContract)
3. ✅ **Route manquante** : `refresh-metadata` remplacé par `loadDapps(true)`
4. ✅ **Re-vérification sync** : Automatique après synchronisation

### Tests

```bash
# Tester la détection des interactions
npx tsx test-interactions-detection.ts

# Tester l'affichage du badge
npx tsx test-badge-display.ts

# Tester l'API
curl "http://localhost:5173/api/user/interactions?address=0x..."
curl "http://localhost:5173/api/dapps"
```

## 📊 Statistiques

- **166 dApps** scrapées depuis Monvision
- **395 contrats** suivis pour la détection
- **19/20 comptes Twitter** scrapés avec succès
- **100%** des dApps enrichies (isEnriched = true)

## 🚀 Utilisation

1. Lancer l'app : `npm run dev`
2. Connecter un wallet qui a interagi avec Monad testnet
3. Ouvrir la Discovery modal
4. Les badges verts "Utilisé" s'affichent automatiquement
5. Cliquer sur "Synchroniser" pour mettre à jour

## 🎯 Prochaines étapes

- ✅ Système de scraping complet
- ✅ Détection des interactions utilisateur
- ✅ Affichage des badges "Utilisé"
- ✅ Re-vérification automatique lors de la sync
- 🔄 Tests en production avec des wallets réels
