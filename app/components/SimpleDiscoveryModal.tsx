import React, { useState } from "react";

interface DApp {
  id: string;
  name: string;
  description: string;
  logoUrl: string;
  category: string;
  website?: string;
  github?: string;
  twitter?: string;
  twitterFollowers?: number;
  contractCount: number;
  totalTxCount: number;
  uniqueUsers: number;
  qualityScore: number;
}

interface SimpleDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SimpleDiscoveryModal({ isOpen, onClose }: SimpleDiscoveryModalProps) {
  const [dapps, setDapps] = useState<DApp[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock data with realistic Monad dApps
    const mockDapps: DApp[] = [
      {
        id: "1",
        name: "MonadSwap",
        description: "Premier DEX automatisé sur Monad Testnet avec pools de liquidité optimisés",
        logoUrl: "https://via.placeholder.com/64/0066ff/ffffff?text=MS",
        category: "DEFI",
        website: "https://monadswap.finance",
        github: "https://github.com/monadswap",
        twitter: "https://twitter.com/monadswap",
        twitterFollowers: 12500,
        contractCount: 3,
        totalTxCount: 45000,
        uniqueUsers: 2300,
        qualityScore: 9.2,
      },
      {
        id: "2", 
        name: "Monad NFT Hub",
        description: "Marketplace NFT de référence pour créateurs et collectionneurs sur Monad",
        logoUrl: "https://via.placeholder.com/64/ff6600/ffffff?text=NFT",
        category: "NFT_MARKETPLACE",
        website: "https://nft.monad.xyz",
        github: "https://github.com/monad-nft",
        twitter: "https://twitter.com/monadnft",
        twitterFollowers: 8900,
        contractCount: 5,
        totalTxCount: 28000,
        uniqueUsers: 1800,
        qualityScore: 8.4,
      },
      {
        id: "3",
        name: "Monad Bridge",
        description: "Pont cross-chain sécurisé connectant Monad à Ethereum et autres blockchains",
        logoUrl: "https://via.placeholder.com/64/9900ff/ffffff?text=BR",
        category: "BRIDGE",
        website: "https://bridge.monad.tech",
        github: "https://github.com/monad-bridge",
        twitter: "https://twitter.com/monadbridge",
        twitterFollowers: 15600,
        contractCount: 2,
        totalTxCount: 67000,
        uniqueUsers: 3200,
        qualityScore: 9.6,
      },
      {
        id: "4",
        name: "Monad Lend",
        description: "Protocole de prêt décentralisé avec rendements optimisés sur Monad",
        logoUrl: "https://via.placeholder.com/64/00cc66/ffffff?text=ML",
        category: "LENDING",
        website: "https://lend.monad.fi",
        twitter: "https://twitter.com/monadlend",
        twitterFollowers: 6800,
        contractCount: 4,
        totalTxCount: 22000,
        uniqueUsers: 1200,
        qualityScore: 7.8,
      }
    ];
    
    setDapps(mockDapps);
    setLoading(false);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      DEFI: "bg-green-500/20 text-green-300 border-green-500/30",
      NFT_MARKETPLACE: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
      BRIDGE: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      LENDING: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      UNKNOWN: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    };
    return colors[category] || colors.UNKNOWN;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              🔍 Découverte de dApps Monad
            </h2>
            <p className="text-gray-400 text-sm">
              Écosystème de protocoles décentralisés sur Monad Testnet
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={handleSync}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Synchronisation..." : "Découvrir"}
            </button>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            dApps découvertes ({dapps.length})
          </h3>

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto mb-4" />
              <p>Analyse de l'écosystème Monad...</p>
              <p className="text-sm mt-2">Récupération des protocoles actifs</p>
            </div>
          ) : dapps.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>Prêt à explorer l'écosystème Monad</p>
              <p className="text-sm mt-2">Cliquez sur "Découvrir" pour voir les protocoles actifs</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dapps.map((dapp, index) => (
                <div
                  key={dapp.id}
                  className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300"
                  style={{
                    animation: `fadeIn 0.3s ease-out ${index * 100}ms both`
                  }}
                >
                  <div className="flex items-start gap-4">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                      <img
                        src={dapp.logoUrl}
                        alt={dapp.name}
                        className="w-12 h-12 rounded-lg bg-gray-700"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-white font-semibold text-lg">{dapp.name}</h3>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(dapp.category)}`}>
                            {dapp.category.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-lg ${dapp.qualityScore >= 8 ? 'text-green-400' : dapp.qualityScore >= 6 ? 'text-yellow-400' : 'text-orange-400'}`}>
                            {dapp.qualityScore}/10
                            {dapp.qualityScore >= 8 && <span className="text-yellow-400 ml-1">⭐</span>}
                          </div>
                          <div className="text-gray-400 text-xs">Quality Score</div>
                        </div>
                      </div>

                      <p className="text-gray-300 text-sm mb-3">{dapp.description}</p>

                      {/* Metrics */}
                      <div className="flex flex-wrap gap-4 mb-3 text-sm">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">📊</span>
                          <span className="text-gray-300">{formatNumber(dapp.totalTxCount)} txs</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">👥</span>
                          <span className="text-gray-300">{formatNumber(dapp.uniqueUsers)} users</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400">📄</span>
                          <span className="text-gray-300">{dapp.contractCount} contracts</span>
                        </div>
                        {dapp.twitterFollowers && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400">🐦</span>
                            <span className="text-gray-300">{formatNumber(dapp.twitterFollowers)} followers</span>
                          </div>
                        )}
                      </div>

                      {/* Links */}
                      <div className="flex items-center gap-2">
                        {dapp.website && (
                          <a href={dapp.website} target="_blank" rel="noopener noreferrer"
                             className="text-gray-400 hover:text-blue-400 transition-colors text-sm">
                            🌐 Website
                          </a>
                        )}
                        {dapp.github && (
                          <a href={dapp.github} target="_blank" rel="noopener noreferrer"
                             className="text-gray-400 hover:text-gray-200 transition-colors text-sm">
                            📚 GitHub
                          </a>
                        )}
                        {dapp.twitter && (
                          <a href={dapp.twitter} target="_blank" rel="noopener noreferrer"
                             className="text-gray-400 hover:text-blue-400 transition-colors text-sm">
                            🐦 Twitter
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
