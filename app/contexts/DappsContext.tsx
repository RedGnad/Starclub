import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";

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
  discord?: string | null;
  telegram?: string | null;
  twitterFollowers: string | null;
  contractCount: number;
  contracts?: any[];
  totalTxCount: number;
  totalEventCount: number;
  uniqueUsers: number;
  activityScore: number;
  qualityScore: number;
  firstActivity: Date | null;
  lastActivity: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isEnriched?: boolean;
}

interface DappsContextValue {
  dapps: DApp[];
  loading: boolean;
  error: string | null;
  syncDapps: (userAddress?: string) => Promise<void>;
  userInteractedDappIds: string[];
  loadUserInteractions: (userAddress: string) => Promise<void>;
  syncMessage: string;
  interactionsLoading: boolean;
  interactionsProgress: string;
}

const DappsContext = createContext<DappsContextValue | undefined>(undefined);

export function DappsProvider({ children }: { children: ReactNode }) {
  const [dapps, setDapps] = useState<DApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [userInteractedDappIds, setUserInteractedDappIds] = useState<string[]>([]);
  const [syncMessage, setSyncMessage] = useState<string>("");
  const [interactionsLoading, setInteractionsLoading] = useState(false);
  const [interactionsProgress, setInteractionsProgress] = useState<string>("");

  /**
   * Load dApps from database
   */
  const loadDapps = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const response = await fetch("/api/dapps");
      if (!response.ok) {
        throw new Error(`Failed to load dApps: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setDapps(data.dapps);
      } else {
        throw new Error(data.error || "Failed to load dApps");
      }
    } catch (err) {
      console.error("Error loading dApps:", err);
      setError(err instanceof Error ? err.message : "Failed to load dApps");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  /**
   * Complete sync workflow: scrape dApps + social links + Twitter followers
   * @param userAddress - Optional user wallet address to re-check interactions after sync
   */
  const syncDapps = async (userAddress?: string) => {
    try {
      setLoading(true);
      setError(null);
      setSyncMessage("Démarrage de la synchronisation complète...");

      // Start complete sync workflow
      const response = await fetch("/api/dapps/sync-complete", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Failed to start sync: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to start sync");
      }

      console.log("✅ Complete sync started in background");
      setSyncMessage("Scraping des projets Monvision (avec liens sociaux)...");

      // Start polling immediately
      setAutoRefresh(true);

      // Keep loading state for a bit to show progress
      setTimeout(() => {
        setLoading(false);
      }, 3000);

      // Re-check user interactions after sync completes (if user is connected)
      if (userAddress) {
        console.log("🔄 Scheduling user interactions re-check after sync...");
        // Wait for sync to stabilize before re-checking
        // This will be triggered when autoRefresh stops (sync complete)
        const checkInterval = setInterval(() => {
          if (!autoRefresh) {
            clearInterval(checkInterval);
            console.log("🔍 Re-checking user interactions after sync completion...");
            loadUserInteractions(userAddress);
          }
        }, 2000);

        // Failsafe: clear interval after 15 minutes
        setTimeout(() => clearInterval(checkInterval), 15 * 60 * 1000);
      }

    } catch (err) {
      console.error("Error starting sync:", err);
      setError(err instanceof Error ? err.message : "Failed to start sync");
      setLoading(false);
      setSyncMessage("");
    }
  };

  /**
   * Load user interactions with dApps using real-time streaming
   */
  const loadUserInteractions = useCallback(async (userAddress: string) => {
    try {
      setInteractionsLoading(true);
      setInteractionsProgress("Démarrage de l'analyse...");
      console.log(`🔍 Loading interactions for ${userAddress}...`);

      // Utiliser l'API de streaming pour les mises à jour en temps réel
      const eventSource = new EventSource(
        `/api/user/interactions-stream?address=${encodeURIComponent(userAddress)}`
      );

      eventSource.addEventListener("start", (event) => {
        console.log("📡 Stream started");
        setInteractionsProgress("Scan des contrats en cours...");
      });

      eventSource.addEventListener("progress", (event) => {
        const progress = JSON.parse(event.data);
        // Format: X/Y contrats scannés
        const message = `${progress.current}/${progress.total} contrats (${progress.percentage.toFixed(0)}%) | ${progress.transactionsFound} tx | ~${progress.estimatedSecondsRemaining}s`;
        setInteractionsProgress(message);
        console.log(`⏳ Progress: ${message}`);
      });

      eventSource.addEventListener("complete", (event) => {
        const data = JSON.parse(event.data);
        if (data.success) {
          setUserInteractedDappIds(data.interactedDappIds || []);
          console.log(`✅ Loaded ${data.interactedDappIds?.length || 0} interactions`);
          setInteractionsProgress(`${data.interactedDappIds?.length || 0} interactions trouvées`);

          // Clear progress message after 3 seconds
          setTimeout(() => {
            setInteractionsProgress("");
            setInteractionsLoading(false);
          }, 3000);
        } else {
          console.warn("Failed to load user interactions:", data.error);
          setUserInteractedDappIds([]);
          setInteractionsProgress("Erreur lors de la recherche");
          setInteractionsLoading(false);
        }
        eventSource.close();
      });

      eventSource.addEventListener("error", (event) => {
        console.error("Error in event stream:", event);
        setUserInteractedDappIds([]);
        setInteractionsProgress("Erreur de connexion");
        setInteractionsLoading(false);
        eventSource.close();
      });

    } catch (err) {
      console.error("Error loading user interactions:", err);
      setUserInteractedDappIds([]);
      setInteractionsProgress("Erreur lors de la recherche");
      setInteractionsLoading(false);
    }
  }, []);

  /**
   * Refresh metadata by reloading dApps from database
   * This is lightweight since it's just a SQL query
   */
  const refreshMetadata = useCallback(async () => {
    try {
      // Silently reload dApps without showing loading state
      await loadDapps(true);
    } catch (err) {
      console.error("Error refreshing metadata:", err);
    }
  }, [loadDapps]);

  // Load dApps on mount
  useEffect(() => {
    loadDapps();
  }, []);

  // Auto-refresh with intelligent stopping (during initial sync only)
  useEffect(() => {
    if (!autoRefresh) return;

    let previousCount = dapps.length;
    let previousEnrichedCount = dapps.filter(d => d.isEnriched).length;
    let previousTwitterCount = dapps.filter(d => d.twitterFollowers).length;
    let stableCount = 0;

    const interval = setInterval(async () => {
      console.log("🔄 Auto-refreshing dApps...");
      await loadDapps(true); // Silent refresh

      const currentEnrichedCount = dapps.filter(d => d.isEnriched).length;
      const currentTwitterCount = dapps.filter(d => d.twitterFollowers).length;

      // Check if counts have stabilized
      const isStable =
        dapps.length === previousCount &&
        currentEnrichedCount === previousEnrichedCount &&
        currentTwitterCount === previousTwitterCount;

      if (isStable) {
        stableCount++;
        if (stableCount >= 5) { // If stable for 10 seconds (5 * 2s)
          console.log("✅ Sync appears complete, stopping auto-refresh");
          setAutoRefresh(false);
          setSyncMessage("");
        }
      } else {
        stableCount = 0;
        // Update message with progress
        const parts = [];
        if (dapps.length > 0) parts.push(`${dapps.length} dApps`);
        if (currentEnrichedCount > 0) parts.push(`${currentEnrichedCount} enrichies`);
        if (currentTwitterCount > 0) parts.push(`${currentTwitterCount} Twitter`);
        setSyncMessage(parts.join(", ") + "...");
      }

      previousCount = dapps.length;
      previousEnrichedCount = currentEnrichedCount;
      previousTwitterCount = currentTwitterCount;
    }, 2000); // Every 2 seconds

    // Failsafe: Stop after 10 minutes (enrichment takes time)
    const timeout = setTimeout(() => {
      console.log("⏹️ Max refresh time reached");
      setAutoRefresh(false);
      setSyncMessage("");
    }, 10 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [autoRefresh, dapps.length]);

  // Periodic metadata refresh (every 5 minutes)
  // Only refreshes Twitter followers, not the entire dApp list
  useEffect(() => {
    // Initial metadata refresh after 10 seconds
    const initialTimeout = setTimeout(() => {
      console.log("🔄 Initial metadata refresh...");
      refreshMetadata();
    }, 10000);

    // Then refresh every 5 minutes
    const interval = setInterval(() => {
      console.log("🔄 Periodic metadata refresh...");
      refreshMetadata();
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [refreshMetadata]);

  return (
    <DappsContext.Provider
      value={{
        dapps,
        loading,
        error,
        syncDapps,
        userInteractedDappIds,
        loadUserInteractions,
        syncMessage,
        interactionsLoading,
        interactionsProgress,
      }}
    >
      {children}
    </DappsContext.Provider>
  );
}

export function useDappsContext() {
  const context = useContext(DappsContext);
  if (context === undefined) {
    throw new Error("useDappsContext must be used within a DappsProvider");
  }
  return context;
}
