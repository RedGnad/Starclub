// Gestionnaire d'état partagé pour la synchronisation des dApps

type ProgressCallback = (current: number, total: number) => void;
type SyncFunction = (progressCb?: ProgressCallback) => Promise<any>;

let globalSyncPromise: Promise<any> | null = null;
let globalProgressCallbacks: ProgressCallback[] = [];

/**
 * Créer une synchronisation partagée pour éviter les doublons
 */
export function createSharedSync(syncFn: SyncFunction): Promise<any> {
  if (globalSyncPromise) {
    console.log('🔄 Réutilisation de la sync en cours...');
    return globalSyncPromise;
  }

  console.log('🚀 Démarrage nouvelle synchronisation...');
  
  const progressWrapper = (current: number, total: number) => {
    globalProgressCallbacks.forEach(cb => cb(current, total));
  };

  globalSyncPromise = syncFn(progressWrapper)
    .finally(() => {
      console.log('✅ Synchronisation terminée');
      globalSyncPromise = null;
      globalProgressCallbacks = [];
    });

  return globalSyncPromise;
}

/**
 * Obtenir la promesse de sync actuelle
 */
export function getSharedSyncPromise(): Promise<any> | null {
  return globalSyncPromise;
}

/**
 * Vérifier si une sync est en cours
 */
export function isGlobalSyncInProgress(): boolean {
  return globalSyncPromise !== null;
}

/**
 * Ajouter un callback de progression
 */
export function addProgressCallback(callback: ProgressCallback): void {
  globalProgressCallbacks.push(callback);
}

/**
 * Supprimer un callback de progression
 */
export function removeProgressCallback(callback: ProgressCallback): void {
  const index = globalProgressCallbacks.indexOf(callback);
  if (index > -1) {
    globalProgressCallbacks.splice(index, 1);
  }
}
