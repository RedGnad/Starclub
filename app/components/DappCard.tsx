import React from "react";

interface DappCardProps {
  dapp: {
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
  };
  index: number;
}

export function DappCard({ dapp, index }: DappCardProps) {
  const getCategoryColor = (category: string) => {
    // Get base category (before underscore) for coloring
    const baseCategory = category.split("_")[0];
    const colors: Record<string, string> = {
      AI: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      CEFI: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      CONSUMER: "bg-pink-500/20 text-pink-300 border-pink-500/30",
      DEFI: "bg-green-500/20 text-green-300 border-green-500/30",
      DEPIN: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      DESCI: "bg-teal-500/20 text-teal-300 border-teal-500/30",
      GAMING: "bg-violet-500/20 text-violet-300 border-violet-500/30",
      GOVERNANCE: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      INFRA: "bg-slate-500/20 text-slate-300 border-slate-500/30",
      NFT: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30",
      SOCIAL: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      TOKEN: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      BRIDGE: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      UNKNOWN: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    };
    return colors[baseCategory] || colors.UNKNOWN;
  };

  const getCategoryDisplay = (category: string) => {
    return category.replace(/_/g, " ");
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
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
      className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300 animate-fade-in"
      style={{
        animationDelay: `${index * 100}ms`,
      }}
    >
      <div className="flex items-start gap-4">
        {/* Logo */}
        <div className="flex-shrink-0">
          {dapp.logoUrl ? (
            <img
              src={dapp.logoUrl}
              alt={dapp.name || "DApp"}
              className="w-12 h-12 rounded-lg bg-gray-700 object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const fallback = target.nextElementSibling as HTMLDivElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className={`w-12 h-12 rounded-lg bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white font-bold text-lg ${
              dapp.logoUrl ? "hidden" : "flex"
            }`}
          >
            {(dapp.name || dapp.symbol || "?").charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-white font-semibold text-lg truncate">
                {dapp.name || `Unnamed DApp #${dapp.id}`}
              </h3>
              {dapp.symbol && (
                <p className="text-gray-400 text-sm">${dapp.symbol}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(
                  dapp.category
                )}`}
              >
                {getCategoryDisplay(dapp.category)}
              </span>
            </div>
          </div>

          {/* Description */}
          {dapp.description && (
            <p className="text-gray-300 text-sm mb-3 line-clamp-2">
              {dapp.description}
            </p>
          )}

          {/* Metrics */}
          <div className="flex flex-wrap gap-4 mb-3 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-gray-400">📊</span>
              <span className="text-gray-300">
                {formatNumber(dapp.totalTxCount)} txs
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-400">👥</span>
              <span className="text-gray-300">
                {formatNumber(dapp.uniqueUsers)} users
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-400">📄</span>
              <span className="text-gray-300">
                {dapp.contractCount} contracts
              </span>
            </div>
            {dapp.twitterFollowers && (
              <div className="flex items-center gap-1">
                <span className="text-gray-400">🐦</span>
                <span className="text-gray-300">
                  {formatNumber(dapp.twitterFollowers)} followers
                </span>
              </div>
            )}
          </div>

          {/* Quality Score */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Quality Score:</span>
              <span className={`font-bold ${getQualityScoreColor(dapp.qualityScore)}`}>
                {dapp.qualityScore.toFixed(1)}/10
              </span>
              {dapp.qualityScore >= 8 && <span className="text-yellow-400">⭐</span>}
            </div>

            {/* Links */}
            <div className="flex items-center gap-2">
              {dapp.website && (
                <a
                  href={dapp.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                  title="Website"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16 8 8 0 000-16zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.559-.499-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.559.499.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.497-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              )}
              {dapp.github && (
                <a
                  href={dapp.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-200 transition-colors"
                  title="GitHub"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
              )}
              {dapp.twitter && (
                <a
                  href={dapp.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                  title="Twitter"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
