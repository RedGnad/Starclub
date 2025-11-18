import React from "react";
import { useAccount, useDisconnect } from "wagmi";
import { LoginModal } from "./LoginModal";
import { DiscoveryModal } from "./DiscoveryModal";
import { MissionPanel } from "./MissionPanel";
import { DAppVerificationModal } from "./DAppVerificationModal";
import { syncDApps } from "../services/discoveryApi";
import Spline from "@splinetool/react-spline";
import {
  createSharedSync,
  addProgressCallback,
  removeProgressCallback,
} from "../utils/syncState";
import type { Application } from "@splinetool/runtime";

// Cache key pour les dApps (même que dans DiscoveryModal)
const DAPPS_CACHE_KEY = "sherlock_dapps_cache";

export function SplinePage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [discoveryOpen, setDiscoveryOpen] = React.useState(false);
  const [missionsOpen, setMissionsOpen] = React.useState(false);
  const [verificationOpen, setVerificationOpen] = React.useState(false);
  const [splineApp, setSplineApp] = React.useState<Application | null>(null);
  const [isSplineLoaded, setIsSplineLoaded] = React.useState(false);

  // État pour la synchronisation des dApps
  const [syncInProgress, setSyncInProgress] = React.useState(false);
  const [syncProgress, setSyncProgress] = React.useState(0);
  
  // Préchargement intelligent des dApps
  React.useEffect(() => {
    console.log('🔍 Discovery useEffect triggered:', { address, isConnected });
    
    // Vérifier le cache existant
    const cached = localStorage.getItem(DAPPS_CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > 30 * 60 * 1000; // 30 min
        
        if (!isExpired && data.length > 0) {
          console.log(`🚀 Cache dApps trouvé (${data.length} protocoles) - pas de preload nécessaire`);
          return; // Pas besoin de preload
        }
      } catch (e) {
        console.warn('⚠️ Cache dApps corrompu, on va le regénérer');
      }
    }
    
    // Pas de cache valide - preload en arrière-plan
    console.log('📥 Preload des dApps en arrière-plan...');
    
    const abortController = new AbortController();
    
    const preloadDapps = async () => {
      try {
        setSyncInProgress(true);
        const sharedSync = createSharedSync(syncDApps);
        
        // Callback pour mettre à jour le progress
        const progressCallback = (progress: number) => {
          setSyncProgress(progress);
        };
        
        addProgressCallback(progressCallback);
        
        const dapps = await sharedSync();
        
        // Sauvegarder en cache
        localStorage.setItem(DAPPS_CACHE_KEY, JSON.stringify({
          data: dapps,
          timestamp: Date.now()
        }));
        
        console.log(`✅ Preload terminé: ${dapps.length} dApps mises en cache`);
        
        removeProgressCallback(progressCallback);
        setSyncInProgress(false);
        setSyncProgress(0);
        
      } catch (error) {
        if (!abortController.signal.aborted) {
          console.error('❌ Erreur lors du preload:', error);
        }
        setSyncInProgress(false);
        setSyncProgress(0);
      }
    };
    
    preloadDapps();
    
    return () => {
      abortController.abort();
    };
  }, [address, isConnected]);

  const handleSplineLoad = React.useCallback((spline: Application) => {
    console.log('🎮 Spline loaded');
    setSplineApp(spline);
    setIsSplineLoaded(true);
  }, []);

  // Gestion des événements clavier
  React.useEffect(() => {
    const keyListener = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "q") {
        if (e.type === "keydown") {
          console.log('🔍 Q key DOWN - Opening dApp verification modal');
          setVerificationOpen(true);
        } else if (e.type === "keyup") {
          console.log('🔍 Q key UP - Verification action completed');
        }
      }
    };

    document.addEventListener("keydown", keyListener);
    document.addEventListener("keyup", keyListener);
    
    return () => {
      document.removeEventListener("keydown", keyListener);
      document.removeEventListener("keyup", keyListener);
    };
  }, []);

  // Contrôles Spline
  const disableSplineControls = React.useCallback(() => {
    if (splineApp) {
      console.log('🚫 Disabling Spline controls - Modal active');
      splineApp.setVariable('userInteracting', false);
    }
  }, [splineApp]);

  const enableSplineControls = React.useCallback(() => {
    if (splineApp) {
      console.log('✅ Re-enabling Spline controls');
      splineApp.setVariable('userInteracting', true);
    }
  }, [splineApp]);

  // Effects pour les modals
  React.useEffect(() => {
    if (modalOpen || discoveryOpen || missionsOpen || verificationOpen) {
      disableSplineControls();
    } else {
      enableSplineControls();
    }
  }, [modalOpen, discoveryOpen, missionsOpen, verificationOpen, disableSplineControls, enableSplineControls]);

  return (
    <div className="app" style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Spline Scene */}
      <Spline
        scene="/scenes/combined_scene.splinecode"
        onLoad={handleSplineLoad}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 1,
        }}
      />

      {/* UI Overlays */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, pointerEvents: "none" }}>
        {/* Modals avec pointer events */}
        <div style={{ pointerEvents: "auto" }}>
          {/* Login Modal */}
          <LoginModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

          {/* Discovery Modal */}
          <DiscoveryModal 
            isOpen={discoveryOpen} 
            onClose={() => setDiscoveryOpen(false)}
            syncInProgress={syncInProgress}
            syncProgress={syncProgress}
          />

          {/* Mission Panel */}
          <MissionPanel isOpen={missionsOpen} onClose={() => setMissionsOpen(false)} />

          {/* DApp Verification Modal */}
          <DAppVerificationModal isOpen={verificationOpen} onClose={() => setVerificationOpen(false)} />
        </div>
      </div>
    </div>
  );
}
