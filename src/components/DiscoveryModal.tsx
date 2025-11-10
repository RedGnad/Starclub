import React, { useState } from "react";
import { DappCard } from "./DappCard";
import { syncDApps } from "../services/discoveryApi";

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
}

export function DiscoveryModal({ isOpen, onClose }: DiscoveryModalProps) {
  const [dapps, setDapps] = useState<DApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("🔄 Syncing dApps from GitHub and Google Sheets...");
      
      // Use real API to fetch data from GitHub and Google Sheets
      const realDapps = await syncDApps();
      
      setDapps(realDapps);
      console.log(`✅ Successfully loaded ${realDapps.length} real dApps from GitHub & Google Sheets`);
      
    } catch (err) {
      console.error("Error syncing dApps:", err);
      setError(err instanceof Error ? err.message : "Failed to sync dApps. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              🔍 Découverte de dApps
            </h2>
            <p className="text-gray-400 text-sm">
              Protocoles Monad enrichis depuis GitHub et Google Sheets
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <button
              onClick={handleSync}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Synchronisation..." : "Synchroniser"}
            </button>

            <button
              onClick={onClose}
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

        {/* dApps List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            dApps découvertes ({dapps.length})
          </h3>

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto mb-4" />
              <p>Récupération des protocoles Monad...</p>
              <p className="text-sm mt-2">Analyse des centaines de protocoles depuis GitHub</p>
              <p className="text-xs mt-2 text-gray-600">Cela peut prendre 30-60 secondes</p>
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
            <div className="text-center py-12 text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p>Aucune dApp découverte pour le moment</p>
              <p className="text-sm mt-2">
                Cliquez sur "Synchroniser" pour charger les dApps depuis GitHub
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {dapps.map((dapp, index) => (
                <DappCard key={dapp.id} dapp={dapp} index={index} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
