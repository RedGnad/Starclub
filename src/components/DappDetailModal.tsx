import React from "react";

interface DApp {
  id: string;
  name: string | null;
  symbol: string | null;
  category: string;
  description: string | null;
  logoUrl: string | null;
  banner: string | null;
  website: string | null;
  github: string | null;
  twitter: string | null;
  twitterFollowers: number | null;
  contractCount: number;
  totalTxCount: number;
  uniqueUsers: number;
  totalEventCount: number;
  activityScore: number;
  qualityScore: number;
  firstActivity: Date | null;
  lastActivity: Date | null;
}

interface DappDetailModalProps {
  dapp: DApp | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DappDetailModal({ dapp, isOpen, onClose }: DappDetailModalProps) {
  if (!isOpen || !dapp) return null;

  const getCategoryColor = (category: string) => {
    const baseCategory = category.split("_")[0];
    const colors: Record<string, string> = {
      AI: "from-purple-500/20 to-purple-600/30 border-purple-500/40",
      CEFI: "from-orange-500/20 to-orange-600/30 border-orange-500/40",
      CONSUMER: "from-pink-500/20 to-pink-600/30 border-pink-500/40",
      DEFI: "from-green-500/20 to-green-600/30 border-green-500/40",
      DEPIN: "from-cyan-500/20 to-cyan-600/30 border-cyan-500/40",
      DESCI: "from-teal-500/20 to-teal-600/30 border-teal-500/40",
      GAMING: "from-violet-500/20 to-violet-600/30 border-violet-500/40",
      GOVERNANCE: "from-indigo-500/20 to-indigo-600/30 border-indigo-500/40",
      INFRA: "from-slate-500/20 to-slate-600/30 border-slate-500/40",
      NFT: "from-fuchsia-500/20 to-fuchsia-600/30 border-fuchsia-500/40",
      SOCIAL: "from-blue-500/20 to-blue-600/30 border-blue-500/40",
      TOKEN: "from-yellow-500/20 to-yellow-600/30 border-yellow-500/40",
      BRIDGE: "from-purple-500/20 to-purple-600/30 border-purple-500/40",
      UNKNOWN: "from-gray-500/20 to-gray-600/30 border-gray-500/40",
    };
    return colors[baseCategory] || colors.UNKNOWN;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const getQualityScoreColor = (score: number) => {
    if (score >= 8) return "text-green-400";
    if (score >= 6) return "text-yellow-400";
    if (score >= 4) return "text-orange-400";
    return "text-red-400";
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop with glassmorphism */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-md"
        onClick={onClose}
        style={{
          backdropFilter: "blur(8px) saturate(150%)",
        }}
      />
      
      {/* Modal */}
      <div className="glass-modal relative max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
        {/* Gradient background */}
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${getCategoryColor(dapp.category)} opacity-80`}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/80 to-gray-900/90 backdrop-blur-xl" />
        
        {/* Content */}
        <div className="relative overflow-y-auto max-h-[90vh]">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {dapp.logoUrl ? (
                    <img
                      src={dapp.logoUrl}
                      alt={dapp.name || "DApp"}
                      className="w-16 h-16 rounded-xl bg-gray-700/50 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const fallback = target.nextElementSibling as HTMLDivElement;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-16 h-16 rounded-xl bg-gradient-to-br from-gray-600/50 to-gray-700/50 flex items-center justify-center text-white font-bold text-xl backdrop-blur-sm ${
                      dapp.logoUrl ? "hidden" : "flex"
                    }`}
                  >
                    {(dapp.name || dapp.symbol || "?").charAt(0).toUpperCase()}
                  </div>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">
                    {dapp.name || `DApp #${dapp.id}`}
                  </h2>
                  <div className="flex items-center gap-3">
                    {dapp.symbol && (
                      <span className="text-gray-300">${dapp.symbol}</span>
                    )}
                    <span className={`px-3 py-1 rounded-full text-sm font-medium bg-white/10 text-white backdrop-blur-sm`}>
                      {dapp.category.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="p-6 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
            <p className="text-gray-200 leading-relaxed">
              {dapp.description || "No description available for this dApp."}
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="p-6 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white mb-4">Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📊</span>
                  <span className="text-gray-300 text-sm">Transactions</span>
                </div>
                <span className="text-white font-bold text-lg">{formatNumber(dapp.totalTxCount)}</span>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">👥</span>
                  <span className="text-gray-300 text-sm">Users</span>
                </div>
                <span className="text-white font-bold text-lg">{formatNumber(dapp.uniqueUsers)}</span>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">📄</span>
                  <span className="text-gray-300 text-sm">Contracts</span>
                </div>
                <span className="text-white font-bold text-lg">{dapp.contractCount}</span>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">⭐</span>
                  <span className="text-gray-300 text-sm">Quality</span>
                </div>
                <span className={`font-bold text-lg ${getQualityScoreColor(dapp.qualityScore)}`}>
                  {dapp.qualityScore.toFixed(1)}/10
                </span>
              </div>
            </div>
          </div>

          {/* Activity & Social */}
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Activity */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Activity</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">First Activity:</span>
                    <span className="text-white">{formatDate(dapp.firstActivity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Last Activity:</span>
                    <span className="text-white">{formatDate(dapp.lastActivity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Events:</span>
                    <span className="text-white">{formatNumber(dapp.totalEventCount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Activity Score:</span>
                    <span className="text-white">{dapp.activityScore.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Links */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Links</h3>
                <div className="space-y-3">
                  {dapp.website && (
                    <a
                      href={dapp.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors backdrop-blur-sm"
                    >
                      <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.499-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.499.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.497-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" />
                      </svg>
                      <span className="text-white">Website</span>
                      <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  
                  {dapp.github && (
                    <a
                      href={dapp.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors backdrop-blur-sm"
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-white">GitHub</span>
                      <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  
                  {dapp.twitter && (
                    <a
                      href={dapp.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors backdrop-blur-sm"
                    >
                      <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                      <span className="text-white">Twitter</span>
                      {dapp.twitterFollowers && (
                        <span className="text-gray-300 text-sm">{formatNumber(dapp.twitterFollowers)} followers</span>
                      )}
                      <svg className="w-4 h-4 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .glass-modal {
          backdrop-filter: blur(16px) saturate(180%);
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.08),
            rgba(255, 255, 255, 0.02)
          );
          box-shadow: 
            0 0 0 1px rgba(255, 255, 255, 0.1),
            0 25px 50px -12px rgba(0, 0, 0, 0.4);
          animation: modal-appear 0.3s ease-out;
        }
        
        @keyframes modal-appear {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
