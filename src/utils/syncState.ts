// État global pour éviter les synchronisations multiples
let globalSyncPromise: Promise<any> | null = null;
let globalSyncInProgress = false;
let progressCallbacks: ((current: number, total: number) => void)[] = [];

// Fonction pour obtenir la promise de sync en cours
export const getSharedSyncPromise = (): Promise<any> | null => {
  return globalSyncPromise;
};

// Fonction pour vérifier si une sync est en cours
export const isGlobalSyncInProgress = (): boolean => {
  return globalSyncInProgress;
};

// Fonction pour définir la promise de sync
export const setSharedSyncPromise = (promise: Promise<any> | null): void => {
  globalSyncPromise = promise;
};

// Fonction pour marquer la sync comme en cours
export const setGlobalSyncInProgress = (inProgress: boolean): void => {
  globalSyncInProgress = inProgress;
};

// Obtenir le nombre de callbacks actifs (pour debug)
export const getActiveCallbacksCount = (): number => {
  return progressCallbacks.length;
};

// Ajouter un callback de progrès
export const addProgressCallback = (callback: (current: number, total: number) => void): void => {
  progressCallbacks.push(callback);
};

// Supprimer un callback de progrès
export const removeProgressCallback = (callback: (current: number, total: number) => void): void => {
  progressCallbacks = progressCallbacks.filter(cb => cb !== callback);
};

// Notifier tous les callbacks de progrès
const notifyProgress = (current: number, total: number): void => {
  progressCallbacks.forEach(callback => {
    try {
      callback(current, total);
    } catch (error) {
      console.warn('Erreur callback progrès:', error);
    }
  });
};

// Fonction utilitaire pour créer une sync partagée
export const createSharedSync = (syncFunction: (progressCallback?: (current: number, total: number) => void) => Promise<any>): Promise<any> => {
  if (globalSyncPromise) {
    console.log('🔄 Sync déjà en cours, retour de la promise existante');
    return globalSyncPromise;
  }
  
  console.log('🔄 Création d\'une nouvelle sync partagée');
  globalSyncInProgress = true;
  
  // Créer la promise avec le callback de progrès partagé
  globalSyncPromise = syncFunction(notifyProgress);
  
  // Nettoyer l'état une fois terminé
  globalSyncPromise
    .then((result) => {
      globalSyncInProgress = false;
      globalSyncPromise = null;
      progressCallbacks = []; // Nettoyer les callbacks
      return result;
    })
    .catch((error) => {
      globalSyncInProgress = false;
      globalSyncPromise = null;
      progressCallbacks = []; // Nettoyer les callbacks
      throw error;
    });
  
  return globalSyncPromise;
};
