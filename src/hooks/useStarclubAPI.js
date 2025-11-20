// Hook React pour utiliser l'API Starclub Backend
// Facilite l'intégration avec le state React + gestion d'erreurs

import { useState, useEffect, useCallback } from 'react';
import { starclubAPI } from '../services/api';

/**
 * Hook pour vérifier l'activité d'un wallet
 */
export function useWalletVerification(address) {
  const [verificationData, setVerificationData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const verifyWallet = useCallback(async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await starclubAPI.verifyWallet(address);
      setVerificationData(result.data);
      console.log('🔍 Wallet verification:', result.data);
    } catch (err) {
      setError(err.message);
      console.error('❌ Wallet verification failed:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Auto-verify when address changes
  useEffect(() => {
    if (address) {
      verifyWallet();
    } else {
      setVerificationData(null);
    }
  }, [address, verifyWallet]);

  return { 
    verificationData, 
    loading, 
    error, 
    refetch: verifyWallet 
  };
}

/**
 * Hook pour récupérer les SuperDApps
 */
export function useSuperDApps() {
  const [dapps, setDapps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDApps = useCallback(async () => {
    console.log('🔍 [useSuperDApps] Fetching SuperDApps...');
    setLoading(true);
    setError(null);
    
    try {
      console.log('🌐 [useSuperDApps] Calling starclubAPI.getSuperDApps()...');
      const result = await starclubAPI.getSuperDApps();
      console.log('🌟 [useSuperDApps] SuperDApps API result:', result);
      
      // Vérification de la structure de la réponse
      if (!result) {
        console.error('❌ [useSuperDApps] Result is null/undefined');
        throw new Error('API returned null result');
      }
      
      if (!result.success) {
        console.error('❌ [useSuperDApps] API returned success=false:', result);
        throw new Error(result.error || 'API returned success=false');
      }
      
      if (!result.data) {
        console.error('❌ [useSuperDApps] No data in result:', result);
        throw new Error('No data in API response');
      }
      
      const dappsArray = result.data.dapps || [];
      console.log(`🌟 [useSuperDApps] Processing ${dappsArray.length} dApps:`, dappsArray);
      
      setDapps(dappsArray);
      console.log(`✅ [useSuperDApps] SuperDApps loaded successfully: ${dappsArray.length} dApps`);
      
    } catch (err) {
      console.error('❌ [useSuperDApps] SuperDApps fetch failed:', err);
      setError(err.message);
      setDapps([]); // Ensure empty array on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDApps();
  }, [fetchDApps]);

  const refreshDApps = useCallback(async () => {
    try {
      await starclubAPI.refreshDApps();
      await fetchDApps(); // Refetch après refresh
    } catch (err) {
      setError(err.message);
    }
  }, [fetchDApps]);

  return { 
    dapps, 
    loading, 
    error, 
    refetch: fetchDApps,
    refresh: refreshDApps
  };
}

/**
 * Hook pour vérifier les interactions d'un utilisateur
 */
export function useUserInteractions(address, dappId = null) {
  const [interactions, setInteractions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkInteractions = useCallback(async () => {
    if (!address) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await starclubAPI.checkUserInteractions(address, dappId);
      setInteractions(result.data);
      console.log('🔗 User interactions:', result.data);
    } catch (err) {
      setError(err.message);
      console.error('❌ User interactions check failed:', err);
    } finally {
      setLoading(false);
    }
  }, [address, dappId]);

  useEffect(() => {
    if (address) {
      checkInteractions();
    } else {
      setInteractions(null);
    }
  }, [address, dappId, checkInteractions]);

  return { 
    interactions, 
    loading, 
    error, 
    refetch: checkInteractions 
  };
}

/**
 * Hook pour récupérer tous les protocoles (Discovery)
 */
export function useProtocols() {
  const [protocols, setProtocols] = useState([]);
  const [loading, setLoading] = useState(false);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProtocols = useCallback(async (isInitialLoad = true) => {
    if (isInitialLoad) {
      setLoading(true);
    } else {
      setBackgroundLoading(true);
    }
    setError(null);
    
    try {
      const result = await starclubAPI.getProtocols();
      setProtocols(result.data.protocols || []);
      console.log('📊 Protocols loaded:', result.data.protocols?.length);
    } catch (err) {
      setError(err.message);
      console.error('❌ Protocols fetch failed:', err);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      } else {
        setBackgroundLoading(false);
      }
    }
  }, []);

  const syncProtocols = useCallback(async () => {
    setBackgroundLoading(true); // Utiliser backgroundLoading pour ne pas cacher les données
    try {
      console.log('🔄 Sync en arrière-plan démarré...');
      await starclubAPI.syncProtocols();
      await fetchProtocols(false); // false = pas un chargement initial
      console.log('✅ Sync en arrière-plan terminé');
    } catch (err) {
      setError(err.message);
      console.error('❌ Sync failed:', err);
    } finally {
      setBackgroundLoading(false);
    }
  }, [fetchProtocols]);

  // Auto-fetch au montage du composant
  useEffect(() => {
    fetchProtocols(true); // Premier chargement
  }, [fetchProtocols]);

  return { 
    protocols, 
    loading, 
    backgroundLoading,
    error, 
    fetch: fetchProtocols,
    sync: syncProtocols
  };
}

/**
 * Hook pour tester la connexion backend
 */
export function useBackendHealth() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    try {
      const result = await starclubAPI.healthCheck();
      setHealth({
        connected: true,
        message: result.message,
        services: result.services
      });
    } catch (err) {
      setHealth({
        connected: false,
        error: err.message
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return { health, loading, refetch: checkHealth };
}
