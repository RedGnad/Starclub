// Discovery Modal CLEAN - Backend only avec VRAIS followers Twitter
import React, { useState } from "react";
import { DappGridCard } from "./DappGridCard";
import { DappDetailModal } from "./DappDetailModal";
import { useProtocols, useSuperDApps } from "../hooks/useStarclubAPI";

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

export function DiscoveryModal({ isOpen, onClose, simulateKeyM }: DiscoveryModalProps) {
  // BACKEND HOOKS - Plus de fake data !
  const { protocols: dapps, loading: backgroundLoading, error, sync: handleRefresh } = useProtocols();
  const { dapps: superDapps } = useSuperDApps();
  
  const [selectedDapp, setSelectedDapp] = useState<DApp | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Ouvrir modal détail
  const openDetailModal = (dapp: DApp) => {
    setSelectedDapp(dapp);
    setDetailModalOpen(true);
  };

  // Fermer modal détail
  const closeDetailModal = () => {
    setDetailModalOpen(false);
    setSelectedDapp(null);
  };

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
              📊 Données RÉELLES depuis backend + scraper Twitter Puppeteer
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Loading indicator */}
            {backgroundLoading && (
              <div className="flex items-center gap-2 text-blue-400 text-sm">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                Scraping followers réels...
              </div>
            )}
            
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={backgroundLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              title="Actualiser avec scraper Twitter réel"
            >
              <span className={backgroundLoading ? "animate-spin" : ""}>
                🔄
              </span>
              {backgroundLoading ? "Scraping..." : "Refresh Backend"}
            </button>

            <button
              onClick={() => {
                onClose();
                simulateKeyM?.();
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">
              🚀 Protocols Backend ({dapps.length})
            </h3>
            <div className="text-sm text-green-400">
              ✅ Backend + Scraper Puppeteer
            </div>
          </div>

          {backgroundLoading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto mb-4" />
              <p>🐦 Scraping vrais followers Twitter...</p>
              <p className="text-sm mt-2">GitHub + Google Sheets + Puppeteer scraper</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <p>❌ Erreur backend: {error}</p>
            </div>
          ) : dapps.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-6xl mb-4">🌌</div>
              <p className="text-lg mb-2">Aucun protocole chargé</p>
              <p className="text-sm mb-4">Cliquez sur "Refresh Backend" pour lancer le scraper</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {(dapps || []).map((dapp: any, index: number) => {
                // Check SuperDApp avec vérifications de sécurité
                const isSuper = superDapps?.some((sd: any) => 
                  sd?.name?.toLowerCase() === dapp?.name?.toLowerCase()
                ) || false;
                
                return (
                  <div 
                    key={dapp?.id || `dapp-${index}`}
                    style={{
                      border: isSuper ? '2px solid #ffd700' : 'transparent',
                      borderRadius: '8px',
                      position: 'relative'
                    }}
                  >
                    {/* SuperDApp Badge */}
                    {isSuper && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        backgroundColor: '#ffd700',
                        color: '#000',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        zIndex: 10
                      }}>
                        ✨ SUPER
                      </div>
                    )}
                    
                    <DappGridCard 
                      dapp={dapp} 
                      index={index} 
                      onClick={() => openDetailModal(dapp)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
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
