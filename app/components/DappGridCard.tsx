import React from "react";

interface DappGridCardProps {
  dapp: {
    id: string;
    name: string | null;
    symbol: string | null;
    category: string;
    description: string | null;
    logoUrl: string | null;
    qualityScore: number;
    totalTxCount: number;
    uniqueUsers: number;
  };
  index: number;
  onClick: () => void;
}

export function DappGridCard({ dapp, index, onClick }: DappGridCardProps) {
  const getCategoryColor = (category: string) => {
    const baseCategory = category.split("_")[0];
    const colors: Record<string, string> = {
      AI: "from-purple-500/30 to-purple-600/40 border-purple-500/40",
      CEFI: "from-orange-500/30 to-orange-600/40 border-orange-500/40",
      CONSUMER: "from-pink-500/30 to-pink-600/40 border-pink-500/40",
      DEFI: "from-green-500/30 to-green-600/40 border-green-500/40",
      DEPIN: "from-cyan-500/30 to-cyan-600/40 border-cyan-500/40",
      DESCI: "from-teal-500/30 to-teal-600/40 border-teal-500/40",
      GAMING: "from-violet-500/30 to-violet-600/40 border-violet-500/40",
      GOVERNANCE: "from-indigo-500/30 to-indigo-600/40 border-indigo-500/40",
      INFRA: "from-slate-500/30 to-slate-600/40 border-slate-500/40",
      NFT: "from-fuchsia-500/30 to-fuchsia-600/40 border-fuchsia-500/40",
      SOCIAL: "from-blue-500/30 to-blue-600/40 border-blue-500/40",
      TOKEN: "from-yellow-500/30 to-yellow-600/40 border-yellow-500/40",
      BRIDGE: "from-purple-500/30 to-purple-600/40 border-purple-500/40",
      UNKNOWN: "from-gray-500/30 to-gray-600/40 border-gray-500/40",
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

  return (
    <div
      onClick={onClick}
      className="glass-card group relative overflow-hidden rounded-xl border cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/10"
      style={{
        animationDelay: `${index * 50}ms`,
        background: `linear-gradient(135deg, ${getCategoryColor(dapp.category).split(' ')[0]} ${getCategoryColor(dapp.category).split(' ')[1]}, rgba(17, 24, 39, 0.8))`,
        backdropFilter: "blur(12px)",
        borderImage: `linear-gradient(135deg, ${getCategoryColor(dapp.category).split(' ')[2].replace('border-', 'rgba(').replace('/40', ', 0.4)')}, transparent) 1`,
      }}
    >
      {/* Glassmorphism gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {/* Content */}
      <div className="relative p-4 h-full flex flex-col">
        {/* Header avec logo */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-shrink-0">
            {dapp.logoUrl ? (
              <img
                src={dapp.logoUrl}
                alt={dapp.name || "DApp"}
                className="w-10 h-10 rounded-lg bg-gray-700/50 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const fallback = target.nextElementSibling as HTMLDivElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              className={`w-10 h-10 rounded-lg bg-gradient-to-br from-gray-600/50 to-gray-700/50 flex items-center justify-center text-white font-bold text-sm backdrop-blur-sm ${
                dapp.logoUrl ? "hidden" : "flex"
              }`}
            >
              {(dapp.name || dapp.symbol || "?").charAt(0).toUpperCase()}
            </div>
            
            {/* Quality score badge */}
            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gray-900/80 border flex items-center justify-center text-xs font-bold ${getQualityScoreColor(dapp.qualityScore)}`}>
              {Math.round(dapp.qualityScore)}
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm truncate">
              {dapp.name || `DApp #${dapp.id}`}
            </h3>
            {dapp.symbol && (
              <p className="text-gray-300/80 text-xs">${dapp.symbol}</p>
            )}
          </div>
        </div>

        {/* Description courte */}
        <p className="text-gray-200/90 text-xs leading-relaxed mb-3 flex-1 line-clamp-3">
          {dapp.description?.slice(0, 80) + (dapp.description && dapp.description.length > 80 ? "..." : "") || "No description available"}
        </p>

        {/* Metrics compactes */}
        <div className="flex justify-between items-center text-xs">
          <div className="flex items-center gap-1 text-blue-300/80">
            <span>📊</span>
            <span>{formatNumber(dapp.totalTxCount)}</span>
          </div>
          <div className="flex items-center gap-1 text-green-300/80">
            <span>👥</span>
            <span>{formatNumber(dapp.uniqueUsers)}</span>
          </div>
        </div>

        {/* Category tag */}
        <div className="mt-3">
          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-white/10 text-white/90 backdrop-blur-sm">
            {dapp.category.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      {/* Hover effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      <style>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .glass-card {
          animation: slide-up 0.4s ease-out forwards;
        }
        
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
