# Détection des Interactions Utilisateur avec les dApps

Ce document explique comment fonctionne la détection des interactions utilisateur avec les dApps dans Sherlock.

## 🎯 Fonctionnalité

Le système détecte automatiquement si un utilisateur a déjà interagi avec une dApp en analysant l'historique on-chain via **Envio HyperSync**.

## 🏗️ Architecture

### Services

#### `UserInteractionsService` ([app/services/user-interactions.service.ts](../app/services/user-interactions.service.ts))

Service principal qui utilise HyperSync pour détecter les interactions :

```typescript
// Détecter toutes les interactions d'un utilisateur
const summary = await service.detectUserDappInteractions(
  userAddress,
  fromBlock, // optionnel
  toBlock    // optionnel
);

// Vérifier si l'utilisateur a interagi avec une dApp spécifique
const hasInteracted = await service.hasUserInteractedWithDapp(
  userAddress,
  dappId
);

// Récupérer uniquement les IDs des dApps (optimisé pour l'UI)
const dappIds = await service.getUserInteractedDappIds(userAddress);
```

### API Routes

#### `GET /api/user/interactions?address=0x123...` ([app/routes/api+/user+/interactions.ts](../app/routes/api+/user+/interactions.ts))

Endpoint pour récupérer les interactions d'un utilisateur :

**Paramètres :**
- `address` (requis) : Adresse Ethereum de l'utilisateur
- `fromBlock` (optionnel) : Bloc de départ
- `toBlock` (optionnel) : Bloc de fin

**Réponse :**
```json
{
  "success": true,
  "userAddress": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
  "interactedDappIds": ["dapp1", "dapp2"],
  "totalInteractions": 2
}
```

### Context React

#### `DappsContext` ([app/contexts/DappsContext.tsx](../app/contexts/DappsContext.tsx))

Le contexte expose :
- `userInteractedDappIds`: Liste des IDs des dApps avec lesquelles l'utilisateur a interagi
- `loadUserInteractions(address)`: Fonction pour charger les interactions

**Usage :**
```typescript
const { userInteractedDappIds, loadUserInteractions } = useDappsContext();
const { address } = useAccount();

// Charger les interactions au montage
useEffect(() => {
  if (address) {
    loadUserInteractions(address);
  }
}, [address]);
```

### Composants UI

#### `DappCard` ([app/components/DappCard.tsx](../app/components/DappCard.tsx))

Affiche un badge "Utilisé" quand `hasUserInteracted={true}` :

```tsx
<DappCard
  dapp={dapp}
  index={index}
  hasUserInteracted={userInteractedDappIds.includes(dapp.id)}
/>
```

#### `DiscoveryModal` ([app/components/DiscoveryModal.tsx](../app/components/DiscoveryModal.tsx))

- Charge automatiquement les interactions quand le modal s'ouvre et qu'un wallet est connecté
- Affiche un compteur du nombre de dApps utilisées dans le header
- Passe la prop `hasUserInteracted` à chaque `DappCard`

## 🚀 Comment ça fonctionne

### 1. Récupération des contrats
Le service récupère tous les contrats associés aux dApps depuis la base de données.

### 2. Scan on-chain avec HyperSync
Pour chaque utilisateur :
1. Formatte l'adresse en topic (format bytes32 padded)
2. Récupère tous les logs où l'adresse apparaît dans `topic1`, `topic2` ou `topic3`
3. Dans Ethereum, les events ont la structure :
   - `topic0` : Signature de l'événement
   - `topic1-3` : Paramètres indexés (souvent les adresses)

### 3. Matching
Le service compare les adresses des contrats émettant les logs avec les contrats des dApps.

### 4. Agrégation
Les résultats sont agrégés par dApp avec :
- Nombre de transactions
- Nombre d'événements
- Dates de première/dernière interaction
- Liste des contrats utilisés

## 🧪 Test

### Script de test

```bash
# Tester avec une adresse
npx tsx scripts/test-user-interactions.ts 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

### API en direct

```bash
# Via curl
curl "http://localhost:5173/api/user/interactions?address=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
```

## ⚡ Performance

- **HyperSync** : 10,000x plus rapide qu'un RPC standard
- **Scan de 10,000 blocs** : ~3 secondes
- **Cache côté client** : Les résultats sont gardés en mémoire dans le contexte React

## 🔧 Configuration

Par défaut, le service analyse les **10,000 derniers blocs**. Pour modifier :

```typescript
const summary = await service.detectUserDappInteractions(
  userAddress,
  currentBlock - 50000, // 50k blocs en arrière
  currentBlock
);
```

## 📊 Plage de blocs recommandée

| Plage | Utilisation |
|-------|-------------|
| 1,000 blocs | Interactions récentes (quelques heures) |
| 10,000 blocs | Par défaut (équilibré) |
| 50,000 blocs | Historique moyen (quelques jours) |
| 100,000+ blocs | Historique complet (peut être lent) |

## 🎨 Customisation du badge

Le badge d'interaction peut être customisé dans [DappCard.tsx](../app/components/DappCard.tsx:119-137) :

```tsx
{hasUserInteracted && (
  <div className="absolute top-2 right-2 z-20">
    <div className="flex items-center gap-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/40 rounded-full px-3 py-1.5 backdrop-blur-md shadow-lg">
      {/* Icône et texte */}
    </div>
  </div>
)}
```

## 🔮 Améliorations futures

### Solution 3 : Indexation proactive (recommandé pour la production)

Pour de meilleures performances en production :

1. **Créer une table `UserInteraction`** dans Prisma
2. **Worker background** qui indexe les interactions en temps réel
3. **Requêtes DB instantanées** au lieu de scans HyperSync

Voir le code commenté dans [user-interactions.service.ts](../app/services/user-interactions.service.ts) pour plus de détails.

## 📝 Notes techniques

- Les adresses Ethereum sont normalisées en lowercase
- Les topics sont paddés à 32 bytes (format bytes32)
- Seuls les logs avec l'adresse dans les topics indexés sont considérés
- Les transactions pures (sans events) ne sont pas détectées actuellement

## 🐛 Troubleshooting

### Aucune interaction détectée alors qu'il devrait y en avoir

1. Vérifiez que les dApps sont bien dans la DB : `SELECT COUNT(*) FROM dapps;`
2. Vérifiez que les contrats sont associés : `SELECT COUNT(*) FROM contracts WHERE dappId IS NOT NULL;`
3. Augmentez la plage de blocs : `fromBlock = currentBlock - 50000`
4. Vérifiez les logs dans la console du navigateur

### Performance lente

1. Réduisez la plage de blocs (max 10,000 pour de bonnes perfs)
2. Vérifiez la latence réseau avec HyperSync
3. Envisagez d'implémenter la Solution 3 (indexation proactive)

## 📚 Ressources

- [Envio HyperSync Documentation](https://docs.envio.dev/docs/hypersync)
- [Ethereum Event Logs](https://ethereum.org/en/developers/docs/apis/json-rpc/#eth_getlogs)
- [Indexed Event Parameters](https://docs.soliditylang.org/en/latest/contracts.html#events)
