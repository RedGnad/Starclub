import React, { useState, useEffect } from "react";
import { CubeLimitAPI, type CubeLimitStatus } from "../services/cubeLimitAPI";

interface CubeLimitIndicatorProps {
  userAddress?: string;
  className?: string;
}

export function CubeLimitIndicator({
  userAddress,
  className = "",
}: CubeLimitIndicatorProps) {
  const [limitStatus, setLimitStatus] = useState<CubeLimitStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadLimitStatus = async () => {
      if (!userAddress) {
        setLimitStatus(null);
        return;
      }

      setLoading(true);

      try {
        const response = await CubeLimitAPI.getLimitStatus(userAddress);
        if (response.success && response.data) {
          setLimitStatus(response.data);
        }
      } catch (error) {
        console.error("Failed to load cube limit status:", error);
      } finally {
        setLoading(false);
      }
    };

    loadLimitStatus();
  }, [userAddress]);

  // Fonction pour refresh le statut (appelée après ouverture de cube)
  const refreshStatus = async () => {
    if (!userAddress) return;

    try {
      const response = await CubeLimitAPI.getLimitStatus(userAddress);
      if (response.success && response.data) {
        setLimitStatus(response.data);
      }
    } catch (error) {
      console.error("Failed to refresh cube limit status:", error);
    }
  };

  // Exposer la fonction pour usage externe (on peut l'améliorer plus tard)
  (window as any).refreshCubeLimit = refreshStatus;

  if (!userAddress || loading || !limitStatus) {
    return null;
  }

  const percentage = (limitStatus.cubeOpensToday / limitStatus.limit) * 100;
  const isNearLimit = percentage >= 80;
  const isAtLimit = limitStatus.cubeOpensToday >= limitStatus.limit;

  return (
    <div
      className={`
      fixed top-4 right-4 z-50
      bg-black/60 backdrop-blur-sm border border-white/20 
      rounded-lg px-3 py-2 text-sm font-mono
      transition-all duration-300 hover:bg-black/80
      ${
        isAtLimit
          ? "border-red-500/50 text-red-400"
          : isNearLimit
          ? "border-orange-500/50 text-orange-400"
          : "text-white/80"
      }
      ${className}
    `}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-current opacity-60"></div>
        <span>
          {limitStatus.cubeOpensToday}/{limitStatus.limit}
        </span>
        {isAtLimit && <span className="text-xs opacity-75">MAX</span>}
      </div>

      {/* Barre de progression discrète */}
      <div className="w-full h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isAtLimit
              ? "bg-red-500"
              : isNearLimit
              ? "bg-orange-500"
              : "bg-green-500"
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
