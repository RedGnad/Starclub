import React, { useState, useEffect } from "react";
import { DappGridCard } from "~/components/DappGridCard";
import { DappDetailModal } from "~/components/DappDetailModal";
import { syncDApps } from "~/services/discoveryApi";
import { getSharedSyncPromise, isGlobalSyncInProgress, createSharedSync, addProgressCallback, removeProgressCallback } from "~/utils/syncState";

interface DApp {
  id: string;
  name: string | null;
  description: string | null;
  logoUrl: string | null;
  banner: string | null;
  symbol: string | null;
  category: string;
  website: string | null;
  github: string | null;
  twitter: string | null;
  twitterFollowers: number | null;
  contractCount: number;
  totalTxCount: number;
  totalEventCount: number;
  uniqueUsers: number;
  activityScore: number;
  qualityScore: number;
  firstActivity: Date | null;
  lastActivity: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface DiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  simulateKeyM?: () => void;
}

const CACHE_KEY = 'sherlock_dapps_cache';
// Cache permanent pour le développement - pas d'expiration

export function DiscoveryModal({ isOpen, onClose, simulateKeyM }: DiscoveryModalProps) {
  const [dapps, setDapps] = useState<DApp[]>([]);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [showProgressiveLoading, setShowProgressiveLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // Pour distinguer refresh vs premier chargement
  const [selectedDapp, setSelectedDapp] = useState<DApp | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Ouvrir le modal de détail
  const openDetailModal = (dapp: DApp) => {
    setSelectedDapp(dapp);
    setDetailModalOpen(true);
  };

  // Fermer le modal de détail
  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedDapp(null);
  };

  // Charger depuis le cache (permanent pour le dev)
  const loadFromCache = (): DApp[] | null => {
    try {
      console.log('🔍 Vérification du cache localStorage...');
      const cached = localStorage.getItem(CACHE_KEY);
      
      if (!cached) {
        console.log('📦 Aucune donnée en cache');
        return null;
      }
      
      const { data, timestamp } = JSON.parse(cached);
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log('📦 Cache vide ou invalide');
        return null;
      }
      
      const cacheAge = Math.round((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
      console.log(`📦 Cache trouvé : ${data.length} dApps (créé il y a ${cacheAge} jours)`);
      return data;
      
    } catch (error) {
      console.warn('⚠️ Cache read error:', error);
      return null;
    }
  };

  // Sauvegarder en cache
  const saveToCache = (data: DApp[]) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log(`💾 Saved ${data.length} dApps to cache`);
    } catch (error) {
      console.warn('⚠️ Cache save error:', error);
    }
  };

  // Formatter le temps écoulé
  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'il y a quelques secondes';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
  };

  // Activer l'affichage progressif après quelques secondes
  const enableProgressiveView = () => {
    if (dapps.length === 0 && backgroundLoading) {
      setShowProgressiveLoading(true);
      console.log('📎 Affichage progressif activé');
    }
  };

  // Timeout pour activer la vue progressive après 3 secondes
  React.useEffect(() => {
    if (backgroundLoading && dapps.length === 0) {
      const timer = setTimeout(() => {
        enableProgressiveView();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [backgroundLoading, dapps.length]);

  // Chargement initial (cache ou première fois)
  const handleInitialLoad = async () => {
    console.log('🔍 Démarrage handleInitialLoad...');
    setIsRefreshing(false); // Premier chargement
    
    // Essayer le cache d'abord
    const cachedDapps = loadFromCache();
    if (cachedDapps && cachedDapps.length > 0) {
      setDapps(cachedDapps);
      console.log(`⚡ Chargement instantané depuis le cache permanent (${cachedDapps.length} dApps)`);
      return;
    }
    
    // Vérifier si une synchronisation globale est déjà en cours
    const sharedPromise = getSharedSyncPromise();
    if (sharedPromise) {
      console.log('🔄 Synchronisation déjà en cours, attente...');
      setBackgroundLoading(true);
      
      // S'enregistrer pour recevoir les updates de progrès
      const progressCallback = (current: number, total: number) => {
        setLoadingProgress({ current, total });
        if (current >= 20 && !showProgressiveLoading) {
          enableProgressiveView();
        }
      };
      addProgressCallback(progressCallback);
      
      try {
        const dapps = await sharedPromise;
        setDapps(dapps);
        console.log(`✅ Récupéré depuis la sync partagée : ${dapps.length} dApps`);
      } catch (error) {
        console.warn('⚠️ Erreur sync partagée:', error);
        setError('Erreur lors de la synchronisation partagée');
      } finally {
        setBackgroundLoading(false);
        removeProgressCallback(progressCallback);
      }
      return;
    }
    
    console.log('📦 Aucun cache trouvé, lancement de la synchronisation...');
    // Sinon charger depuis l'API
    await handleBackgroundRefresh();
  };

  // Actualisation en arrière-plan
  const handleBackgroundRefresh = async () => {
    setBackgroundLoading(true);
    setError(null);
    setLoadingProgress({ current: 0, total: 0 });
    setIsRefreshing(true); // C'est une actualisation
    
    try {
      console.log('🔄 Actualisation en arrière-plan depuis GitHub...');
      
      // Vérifier si une sync est déjà en cours
      const existingPromise = getSharedSyncPromise();
      let newDapps;
      
      if (existingPromise) {
        console.log('🔄 Sync déjà en cours, attente de la complétion...');
        newDapps = await existingPromise;
      } else {
        // S'enregistrer pour recevoir les updates de progrès
        const progressCallback = (current: number, total: number) => {
          setLoadingProgress({ current, total });
          // Pas de vue progressive pendant une actualisation
          if (!isRefreshing && current >= 20 && !showProgressiveLoading) {
            enableProgressiveView();
          }
        };
        addProgressCallback(progressCallback);
        
        try {
          // Créer une nouvelle sync partagée
          newDapps = await createSharedSync((progressCb) => syncDApps(progressCb));
        } finally {
          removeProgressCallback(progressCallback);
        }
      }
      
      // Comparer avec les données existantes
      const hasChanges = !dapps.length || 
        newDapps.length !== dapps.length ||
        JSON.stringify(newDapps.map((d: DApp) => d.id).sort()) !== JSON.stringify(dapps.map((d: DApp) => d.id).sort());
      
      if (hasChanges) {
        setDapps(newDapps);
        console.log(`✅ Mise à jour : ${newDapps.length} dApps (${hasChanges ? 'changements détectés' : 'aucun changement'})`);
      } else {
        console.log('📝 Aucun changement détecté, pas de mise à jour nécessaire');
      }
      
      saveToCache(newDapps);
      setLastRefresh(new Date());
      
    } catch (err) {
      console.error('Error refreshing dApps:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'actualisation');
    } finally {
      setBackgroundLoading(false);
      setLoadingProgress({ current: 0, total: 0 });
    }
  };


  // Auto-chargement à l'ouverture
  useEffect(() => {
    if (isOpen && dapps.length === 0 && !backgroundLoading) {
      handleInitialLoad();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Liquid Glass Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-lg"
        onClick={() => {
          onClose();
          simulateKeyM?.();
        }}
        style={{
          backdropFilter: "blur(12px) saturate(150%)",
          background: "linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(30, 30, 60, 0.2))",
        }}
      />
      
      {/* Liquid Glass Modal Container */}
      <div className="glass-discovery-modal relative max-w-5xl w-full max-h-[90vh] flex flex-col rounded-2xl border border-white/20 shadow-2xl overflow-hidden">
        {/* Glass gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/70 to-gray-900/90" style={{ backdropFilter: "blur(16px)" }} />
        {/* Header */}
        <div className="relative p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              🔍 Découverte de dApps
            </h2>
            <p className="text-gray-400 text-sm">
              Protocoles Monad enrichis depuis GitHub et Google Sheets
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Indicateur de refresh en arrière-plan */}
            {backgroundLoading && (
              <div className="flex items-center gap-2 text-blue-400 text-sm">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                {backgroundLoading ? (
                  isRefreshing ? (
                    loadingProgress.total > 0 ? (
                      `Recherche nouveautés... ${loadingProgress.current} sources analysées`
                    ) : (
                      "Recherche de nouvelles dApps..."
                    )
                  ) : (
                    loadingProgress.total > 0 ? (
                      `Chargement... ${loadingProgress.current}/${loadingProgress.total}`
                    ) : (
                      "Initialisation..."
                    )
                  )
                ) : dapps.length > 0 ? (
                  "Actualiser depuis GitHub"
                ) : (
                  "Charger les dApps"
                )}
              </div>
            )}
            
            {/* Statut dernière actualisation */}
            {lastRefresh && !backgroundLoading && (
              <div className="text-xs text-gray-500">
                ✅ Mis à jour {formatTimeAgo(lastRefresh)}
              </div>
            )}
            
            {/* Bouton unique de refresh */}
            <button
              onClick={dapps.length > 0 ? handleBackgroundRefresh : handleInitialLoad}
              disabled={backgroundLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              title={dapps.length > 0 ? "Actualiser en arrière-plan" : "Charger les dApps"}
            >
              <span className={backgroundLoading ? "animate-spin" : ""}>
                🔄
              </span>
              {dapps.length > 0 ? "Actualiser" : "Charger"}
            </button>

            <button
              onClick={() => {
            onClose();
            if (simulateKeyM) {
              simulateKeyM();
            }
          }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="relative flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              dApps découvertes ({dapps.length})
            </h3>
            {dapps.length > 0 && (() => {
              try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                  const { timestamp } = JSON.parse(cached);
                  const daysAgo = Math.round((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
                  const hoursAgo = Math.round((Date.now() - timestamp) / (1000 * 60 * 60));
                  return (
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      <span>📦 Cache: {daysAgo > 0 ? `${daysAgo}j` : `${hoursAgo}h`}</span>
                      {backgroundLoading && (
                        <span className="text-blue-400 text-xs">• En cours...</span>
                      )}
                    </div>
                  );
                }
              } catch {}
              return null;
            })()}
          </div>

          {dapps.length === 0 && backgroundLoading && !showProgressiveLoading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto mb-4" />
              <p>Récupération des protocoles Monad...</p>
              {loadingProgress.total > 0 && (
                <div className="mt-4">
                  <div className="bg-gray-700 rounded-full h-3 max-w-md mx-auto mb-2">
                    <div 
                      className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm">
                    {loadingProgress.current} / {loadingProgress.total} protocoles 
                    ({Math.round((loadingProgress.current / loadingProgress.total) * 100)}%)
                  </p>
                </div>
              )}
              <p className="text-sm mt-2">Analyse des protocoles depuis GitHub & Google Sheets</p>
              <p className="text-xs mt-2 text-gray-600">
                {loadingProgress.total > 0 ? (
                  `Estimation: ${Math.round((loadingProgress.total - loadingProgress.current) * 0.3)} secondes restantes`
                ) : (
                  "Préparation du chargement..."
                )}
              </p>
              <p className="text-xs mt-1 text-blue-400">
                💾 Les données seront sauvegardées en permanence
              </p>
            </div>
          ) : showProgressiveLoading ? (
            <div className="space-y-3">
              <div className="text-sm text-blue-400 mb-4 text-center">
                {isRefreshing ? (
                  "🔍 Recherche de nouvelles dApps et mise à jour..."
                ) : (
                  `🔄 ${loadingProgress.current}/${loadingProgress.total} protocoles chargés... Affichage des premiers résultats`
                )}
              </div>
              
              {/* Skeleton loading cards */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gray-700 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-700 rounded w-3/4" />
                      <div className="h-3 bg-gray-700 rounded w-1/2" />
                      <div className="h-3 bg-gray-700 rounded w-2/3" />
                    </div>
                    <div className="w-16 h-6 bg-gray-700 rounded" />
                  </div>
                </div>
              ))}
              
              <div className="text-center text-gray-500 text-sm mt-4">
                ⏳ Les vraies données apparaitront dès que le chargement sera terminé...
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <svg
                className="w-16 h-16 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p>Erreur lors du chargement des dApps</p>
              <p className="text-sm mt-2 text-red-400">{error}</p>
            </div>
          ) : dapps.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">🌌</div>
              <p className="text-lg mb-2">Aucune dApp en cache</p>
              <p className="text-sm mb-4">Cliquez sur "Charger les dApps" pour récupérer tous les protocoles Monad</p>
              <div className="text-xs bg-gray-800 p-3 rounded-lg inline-block">
                💾 Les données seront sauvées en permanence pour les prochaines utilisations
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {dapps.map((dapp, index) => (
                <DappGridCard 
                  key={dapp.id} 
                  dapp={dapp} 
                  index={index} 
                  onClick={() => openDetailModal(dapp)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de détail */}
      <DappDetailModal 
        dapp={selectedDapp}
        isOpen={detailModalOpen}
        onClose={closeDetailModal}
      />

      <style>{`
        .glass-discovery-modal {
          backdrop-filter: blur(20px) saturate(180%);
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.05)
          );
          box-shadow: 
            0 0 0 1px rgba(255, 255, 255, 0.1),
            0 25px 50px -12px rgba(0, 0, 0, 0.5);
          animation: glass-modal-appear 0.4s ease-out;
        }
        
        @keyframes glass-modal-appear {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
            backdrop-filter: blur(0px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
            backdrop-filter: blur(20px);
          }
        }
        
        .glass-discovery-modal::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, 
            transparent, 
            rgba(255, 255, 255, 0.3), 
            transparent
          );
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
