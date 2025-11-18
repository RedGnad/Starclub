# 👤 Guide utilisateur : Voir vos interactions avec les dApps

## 🎯 Qu'est-ce que c'est ?

Sherlock peut maintenant détecter automatiquement avec quelles dApps vous avez déjà interagi sur Monad Testnet. Un badge **"Utilisé"** apparaît sur les cartes des dApps que vous avez déjà utilisées.

## 🚀 Comment ça marche ?

### 1. Connectez votre wallet

Cliquez sur le bouton **"Connect Wallet"** en haut à droite et connectez votre wallet MetaMask, Rabby, ou autre.

### 2. Ouvrez le modal de découverte

Cliquez sur **"Discover dApps"** pour ouvrir la liste complète des dApps.

### 3. Visualisez vos interactions

- Un badge **vert "✓ Utilisé"** apparaît sur les dApps que vous avez utilisées
- Le header affiche **"X utilisées"** avec le nombre total

## 📊 Qu'est-ce qui est détecté ?

Le système analyse votre historique on-chain sur les **10,000 derniers blocs** (~dernières heures/jours) et détecte :

- ✅ Transactions envoyées vers des contrats de dApps
- ✅ Événements (events) où votre adresse apparaît
- ✅ Interactions avec tous les contrats d'une dApp

### Ce qui EST détecté :
- Swaps sur un DEX
- Dépôts/retraits sur un protocole de lending
- Mint de NFT
- Votes dans une DAO
- Staking de tokens
- Toute interaction qui émet un event on-chain

### Ce qui N'est PAS détecté :
- Visites sur le site web (pas on-chain)
- Transactions très anciennes (au-delà de 10k blocs)
- Transactions "view" (lecture seule, pas de transaction)

## 🎨 Apparence

### Badge "Utilisé"
```
┌─────────────────────────────────────┐
│  [Logo]  Uniswap     [✓ Utilisé]   │← Badge vert
│          DeFi - DEX                 │
│          Leading decentralized...   │
└─────────────────────────────────────┘
```

### Compteur dans le header
```
┌─────────────────────────────────────────────┐
│ dApps découvertes (241)    [✓ 5 utilisées] │
│                            ^^^^^^^^^^^^^^^^  │
│                            Votre compteur    │
└─────────────────────────────────────────────┘
```

## ⚡ Performance

- **Chargement** : ~3-4 secondes
- **Actualisation** : À chaque ouverture du modal
- **Cache** : Les résultats restent en mémoire jusqu'au reload de la page

## 🔒 Confidentialité

- ✅ Aucune donnée n'est stockée sur nos serveurs
- ✅ Analyse uniquement des données publiques on-chain
- ✅ Votre adresse n'est jamais partagée
- ✅ Tout se passe côté client

## 🐛 Problèmes courants

### "Aucune interaction détectée" alors que j'ai utilisé une dApp

**Solutions :**
1. Vérifiez que vous êtes bien connecté avec la bonne adresse
2. L'interaction était peut-être il y a plus de 10,000 blocs
3. Certaines dApps ne sont peut-être pas encore dans notre base de données
4. Essayez de synchroniser les dApps avec le bouton "Synchroniser"

### Le chargement est lent

**Pourquoi :**
- Analyse de centaines de contrats et milliers de blocs
- Dépend de votre connexion internet et de la charge du réseau

**Normal :** ~3-4 secondes

### Mon interaction récente n'apparaît pas

**Raison :**
- Le cache du navigateur garde les anciens résultats
- Rechargez la page (F5) pour forcer une nouvelle analyse

## 💡 Astuces

### Voir plus d'historique

Pour les développeurs, vous pouvez tester avec plus de blocs :

```bash
# Via l'API directement (dans la console navigateur)
fetch('/api/user/interactions?address=VOTRE_ADRESSE&fromBlock=0')
  .then(r => r.json())
  .then(console.log)
```

### Tester avec une adresse spécifique

```bash
# Via le terminal
npx tsx scripts/test-user-interactions.ts 0xVOTRE_ADRESSE
```

## 🎯 Cas d'usage

### 1. Portfolio personnel
Voyez rapidement quels protocoles vous utilisez déjà

### 2. Découverte
Identifiez les dApps populaires que vous n'avez pas encore testées

### 3. Tracking
Gardez une trace de votre activité on-chain

### 4. Comparaison
Comparez votre utilisation avec d'autres utilisateurs (feature future)

## 🔮 Fonctionnalités futures

### En développement :
- 🏆 Leaderboards (utilisateurs les plus actifs)
- 🎖️ Badges & achievements
- 📊 Analytics détaillées par dApp
- 📈 Graphiques d'activité dans le temps
- 🔔 Notifications pour nouvelles interactions
- 💾 Historique complet (tous les blocs)

### Roadmap :
- Multi-chain support (Ethereum, BSC, etc.)
- Export CSV de vos interactions
- Intégration avec d'autres outils d'analytics
- API publique

## 📞 Support

### Problème technique ?
1. Ouvrez la console du navigateur (F12)
2. Cherchez les messages d'erreur
3. Créez une issue sur GitHub avec les logs

### Question ?
- Consultez la [documentation complète](./USER_INTERACTIONS.md)
- Lisez le [résumé technique](./IMPLEMENTATION_SUMMARY.md)

## 🎉 Profitez !

Cette fonctionnalité vous permet de mieux comprendre votre activité on-chain et de découvrir de nouvelles dApps. Connectez votre wallet et explorez ! 🚀
