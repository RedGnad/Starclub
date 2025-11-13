import React from "react";
import { useAccount, useDisconnect } from "wagmi";
import { LoginModal } from "./components/LoginModal";
import { DiscoveryModal } from "./components/DiscoveryModal";
import { syncDApps } from "./services/discoveryApi";
import Spline from "@splinetool/react-spline";
import {
  createSharedSync,
  addProgressCallback,
  removeProgressCallback,
} from "./utils/syncState";
import type { Application } from "@splinetool/runtime";
import { WagmiConfig } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./wagmi";

const queryClient = new QueryClient();

// Cache key pour les dApps (même que dans DiscoveryModal)
const DAPPS_CACHE_KEY = "sherlock_dapps_cache";

function SplinePage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [discoveryOpen, setDiscoveryOpen] = React.useState(false);
  const [signed, setSigned] = React.useState(false);
  const [splineLoaded, setSplineLoaded] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [nearArcadeMachine, setNearArcadeMachine] = React.useState(false);
  const [debugInfo, setDebugInfo] = React.useState<string>("Initializing...");
  const [preloadStatus, setPreloadStatus] = React.useState<string>("");
  const splineAppRef = React.useRef<Application | null>(null);

  // État pour contrôler le blocage des événements Spline
  const [blockSplineEvents, setBlockSplineEvents] = React.useState(false);

  // Fonction pour simuler un appui de touche 'm' (cycle complet keydown + keyup)
  const simulateKeyM = () => {
    console.log("🎹 Simulating M key press from Discovery modal close");

    // Créer les événements keydown et keyup
    const keydownEvent = new KeyboardEvent("keydown", {
      key: "m",
      code: "KeyM",
      keyCode: 77,
      which: 77,
      bubbles: true,
      cancelable: true,
    });

    const keyupEvent = new KeyboardEvent("keyup", {
      key: "m",
      code: "KeyM",
      keyCode: 77,
      which: 77,
      bubbles: true,
      cancelable: true,
    });

    // Simuler le cycle complet keydown -> keyup
    document.dispatchEvent(keydownEvent);

    // Petit délai pour simuler un vrai appui de touche
    setTimeout(() => {
      document.dispatchEvent(keyupEvent);
      console.log("🎹 M key up event dispatched");
    }, 50); // 50ms de délai réaliste
  };

  // Fonction pour simuler un appui de touche 'c' (cycle complet keydown + keyup)
  const simulateKeyC = () => {
    console.log("🎹 Simulating C key press from Camera Chog position");

    // Créer les événements keydown et keyup
    const keydownEvent = new KeyboardEvent("keydown", {
      key: "c",
      code: "KeyC",
      keyCode: 67,
      which: 67,
      bubbles: true,
      cancelable: true,
    });

    const keyupEvent = new KeyboardEvent("keyup", {
      key: "c",
      code: "KeyC",
      keyCode: 67,
      which: 67,
      bubbles: true,
      cancelable: true,
    });

    // Simuler le cycle complet keydown -> keyup
    document.dispatchEvent(keydownEvent);

    // Petit délai pour simuler un vrai appui de touche
    setTimeout(() => {
      document.dispatchEvent(keyupEvent);
      console.log("🎹 C key up event dispatched");
    }, 50); // 50ms de délai réaliste
  };

  // Fonction pour simuler un appui de touche 'y' (cycle complet keydown + keyup)
  const simulateKeyY = () => {
    console.log("🎹 Simulating Y key press from Camera position");

    // Créer les événements keydown et keyup
    const keydownEvent = new KeyboardEvent("keydown", {
      key: "y",
      code: "KeyY",
      keyCode: 89,
      which: 89,
      bubbles: true,
      cancelable: true,
    });

    const keyupEvent = new KeyboardEvent("keyup", {
      key: "y",
      code: "KeyY",
      keyCode: 89,
      which: 89,
      bubbles: true,
      cancelable: true,
    });

    // Simuler le cycle complet keydown -> keyup
    document.dispatchEvent(keydownEvent);

    // Petit délai pour simuler un vrai appui de touche
    setTimeout(() => {
      document.dispatchEvent(keyupEvent);
      console.log("🎹 Y key up event dispatched");
    }, 50); // 50ms de délai réaliste
  };

  // Solution radicale pour bloquer TOUS les événements clavier vers Spline
  React.useEffect(() => {
    if (!mounted) return;

    const globalKeyBlocker = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isModalActive = discoveryOpen || modalOpen;

      // Liste des touches à bloquer complètement quand modal actif
      const criticalKeys = [
        "escape",
        "enter",
        " ",
        "space",
        "tab",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
      ];

      if (isModalActive) {
        // Bloquer TOUTES les touches critiques
        if (criticalKeys.includes(key) || key === " ") {
          console.log(
            `🛑 BLOCKING ${e.type.toUpperCase()} '${key}' - Modal active`
          );
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }

        // Bloquer aussi les touches de navigation Spline courantes
        if (
          ["w", "a", "s", "d", "q", "e", "shift", "control", "alt"].includes(
            key
          )
        ) {
          console.log(`🎮 BLOCKING Spline control '${key}' - Modal active`);
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        }
      }
    };

    // S'enregistrer au niveau WINDOW avec CAPTURE = true (priorité maximale)
    window.addEventListener("keydown", globalKeyBlocker, {
      capture: true,
      passive: false,
    });
    window.addEventListener("keyup", globalKeyBlocker, {
      capture: true,
      passive: false,
    });

    return () => {
      window.removeEventListener("keydown", globalKeyBlocker, {
        capture: true,
      });
      window.removeEventListener("keyup", globalKeyBlocker, { capture: true });
    };
  }, [mounted, discoveryOpen, modalOpen]);

  // Désactiver les contrôles Spline quand modal ouvert
  React.useEffect(() => {
    if (splineAppRef.current) {
      try {
        // Tenter de désactiver les contrôles Spline directement
        const app = splineAppRef.current as any;

        if (discoveryOpen || modalOpen) {
          console.log("🚫 Disabling Spline controls - Modal active");

          // Méthodes possibles pour désactiver Spline
          if (app.setControlsEnabled) app.setControlsEnabled(false);
          if (app.controls && app.controls.enabled !== undefined)
            app.controls.enabled = false;
          if (app._controls && app._controls.enabled !== undefined)
            app._controls.enabled = false;

          // Bloquer le focus sur le canvas Spline
          const canvas = document.querySelector("canvas");
          if (canvas) {
            canvas.style.pointerEvents = "none";
            canvas.blur();
          }
        } else {
          console.log("✅ Re-enabling Spline controls");

          // Réactiver les contrôles
          if (app.setControlsEnabled) app.setControlsEnabled(true);
          if (app.controls && app.controls.enabled !== undefined)
            app.controls.enabled = true;
          if (app._controls && app._controls.enabled !== undefined)
            app._controls.enabled = true;

          // Réactiver le canvas
          const canvas = document.querySelector("canvas");
          if (canvas) {
            canvas.style.pointerEvents = "auto";
          }
        }
      } catch (error) {
        console.warn("Warning: Could not control Spline state:", error);
      }
    }
  }, [discoveryOpen, modalOpen]);

  // Fonction pour précharger les dApps en arrière-plan
  const preloadDAppsIfNeeded = async () => {
    try {
      // Vérifier si on a déjà des données en cache
      const cached = localStorage.getItem(DAPPS_CACHE_KEY);
      if (cached) {
        const { data } = JSON.parse(cached);
        if (data && data.length > 0) {
          console.log(
            `🚀 Cache dApps trouvé (${data.length} protocoles) - pas de preload nécessaire`
          );
          setPreloadStatus(`📦 ${data.length} dApps déjà en cache`);
          return;
        }
      }

      console.log("📦 Aucun cache dApps - démarrage preload...");

      console.log("🔄 Démarrage du preload dApps en arrière-plan...");
      setPreloadStatus("🔄 Preload en cours...");

      // S'enregistrer pour le debug de progrès dans l'app
      const appProgressCallback = (current: number, total: number) => {
        console.log(`🔄 Preload progress: ${current}/${total}`);
      };
      addProgressCallback(appProgressCallback);

      // Créer une synchronisation partagée
      const syncPromise = createSharedSync((progressCb) =>
        syncDApps(progressCb)
      );

      // Lancer la synchronisation en arrière-plan (silencieuse)
      syncPromise
        .then((dapps) => {
          // Sauvegarder en cache
          const cacheData = {
            data: dapps,
            timestamp: Date.now(),
          };
          localStorage.setItem(DAPPS_CACHE_KEY, JSON.stringify(cacheData));
          console.log(
            `✅ Preload terminé : ${dapps.length} dApps cachées en arrière-plan`
          );
          console.log("💾 Cache sauvegardé avec la clé:", DAPPS_CACHE_KEY);

          // Vérifier que les données sont bien sauvées
          const verification = localStorage.getItem(DAPPS_CACHE_KEY);
          if (verification) {
            const verif = JSON.parse(verification);
            console.log(
              `✅ Vérification cache : ${verif.data?.length || 0} dApps sauvées`
            );
          }

          setPreloadStatus(`✅ ${dapps.length} dApps préchargées`);
          removeProgressCallback(appProgressCallback);
          return dapps;
        })
        .catch((error) => {
          console.warn("⚠️ Erreur preload dApps:", error);
          setPreloadStatus("⚠️ Erreur preload");
          removeProgressCallback(appProgressCallback);

          // Ne pas bloquer l'app en cas d'erreur
          throw error;
        });
    } catch (error) {
      console.warn("⚠️ Erreur vérification cache dApps:", error);
    }
  };

  // Fix hydration - wait for mount
  React.useEffect(() => {
    setMounted(true);

    // Preload dApps en arrière-plan si pas de cache
    preloadDAppsIfNeeded();

    // Fonction pour bloquer les événements si nécessaire
    const shouldBlockEvent = (e: KeyboardEvent): boolean => {
      // Bloquer si modal Discovery est ouvert
      if (discoveryOpen) {
        console.log(`🚫 Blocking ${e.key} event - Discovery modal is open`);
        return true;
      }

      // Bloquer si modal Login est ouvert
      if (modalOpen) {
        console.log(`🚫 Blocking ${e.key} event - Login modal is open`);
        return true;
      }

      // Bloquer si état spécifique activé
      if (blockSplineEvents) {
        console.log(`🚫 Blocking ${e.key} event - Spline events disabled`);
        return true;
      }

      return false;
    };

    // Listener pour débugger les événements clavier
    const keyListener = (e: KeyboardEvent) => {
      // Vérifier si on doit bloquer cet événement
      if (shouldBlockEvent(e)) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key.toLowerCase() === "x") {
        console.log("🎯 X key detected!", {
          key: e.key,
          code: e.code,
          keyCode: e.keyCode,
          type: e.type,
          target: e.target,
          bubbles: e.bubbles,
        });
      }

      // Ouvrir Discovery modal avec la touche "D" (seulement si proche de l'Arcade Machine)
      if (e.key.toLowerCase() === "d" && !modalOpen) {
        if (nearArcadeMachine) {
          console.log(
            "🔍 Discovery modal opened with D key - Near Arcade Machine"
          );
          setDiscoveryOpen(true);
        } else {
          console.log("😫 Discovery blocked - Not near Arcade Machine");
        }
      }

      // Action avec la touche "M"
      if (e.key.toLowerCase() === "m") {
        if (e.type === "keydown") {
          console.log("🎹 M key DOWN - Custom action triggered");
          // Ajouter ici l'action que tu veux déclencher avec 'M'
          // Par exemple: fermer des modals, changer de vue, etc.
        } else if (e.type === "keyup") {
          console.log("🎹 M key UP - Action completed");
          // Actions à exécuter sur le keyup si nécessaire
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

  // Auth state management
  React.useEffect(() => {
    if (isConnected && address) {
      const key = `sherlock_auth_${address}`;
      setSigned(!!localStorage.getItem(key));
      if (!localStorage.getItem(key)) {
        setModalOpen(true);
      }
    } else {
      setSigned(false);
    }
  }, [isConnected, address]);

  function onLoad(app: Application) {
    console.log("🎮 Spline loaded");
    splineAppRef.current = app;
    setSplineLoaded(true);
    setDebugInfo(
      "Spline loaded - Searching for Sphere 5, Sphere 7, Sphere 8, Camera Chog & Camera Yaki..."
    );

    // États pour suivre les positions précédentes et éviter le clignotement
    let previousCameraChogState = false;
    let previousSphere5State = false;
    let previousSphere7State = false;
    let previousSphere8State = false;
    let previousCameraState = false;
    let stableDiscoveryState = false;

    // Fonction pour vérifier la position des sphères et objets (Sphere 5, Sphere 7, Sphere 8, Camera Chog, Camera Yaki)
    const checkObjectsPosition = () => {
      try {
        const sphere5 = app.findObjectByName("Sphere 5");
        const sphere7 = app.findObjectByName("Sphere 7");
        const sphere8 = app.findObjectByName("Sphere 8");
        const cameraChog = app.findObjectByName("Camera Chog");
        const camera = app.findObjectByName("Camera Yaki");

        let sphere5Near = false;
        let sphere7Near = false;
        let sphere8Near = false;
        let cameraChogActive = false;
        let cameraActive = false;
        let sphere5Status = "NOT FOUND";
        let sphere7Status = "NOT FOUND";
        let sphere8Status = "NOT FOUND";
        let cameraChogStatus = "NOT FOUND";
        let cameraStatus = "NOT FOUND";

        // Vérifier Sphere 5 avec hysteresis pour éviter le clignotement
        if (sphere5) {
          const sphere5Distance = Math.abs(sphere5.position.y - -1000);
          
          // Hysteresis : plus strict pour activer (±3), plus tolérant pour désactiver (±8)
          if (!previousSphere5State && sphere5Distance < 3) {
            sphere5Near = true; // Activation stricte
          } else if (previousSphere5State && sphere5Distance < 8) {
            sphere5Near = true; // Maintien avec tolérance
          } else {
            sphere5Near = false;
          }
          
          previousSphere5State = sphere5Near;
          sphere5Status = `${
            sphere5Near ? "ACTIVE (y≈-1000)" : "INACTIVE"
          } | Position: ${Math.round(sphere5.position.x)},${Math.round(
            sphere5.position.y
          )},${Math.round(sphere5.position.z)} | Distance: ${Math.round(sphere5Distance)}`;
        }

        // Vérifier Sphere 7 avec hysteresis pour éviter le clignotement
        if (sphere7) {
          const sphere7Distance = Math.abs(sphere7.position.y - -1000);
          
          // Hysteresis : plus strict pour activer (±3), plus tolérant pour désactiver (±8)
          if (!previousSphere7State && sphere7Distance < 3) {
            sphere7Near = true; // Activation stricte
          } else if (previousSphere7State && sphere7Distance < 8) {
            sphere7Near = true; // Maintien avec tolérance
          } else {
            sphere7Near = false;
          }
          
          previousSphere7State = sphere7Near;
          sphere7Status = `${
            sphere7Near ? "ACTIVE (y≈-1000)" : "INACTIVE"
          } | Position: ${Math.round(sphere7.position.x)},${Math.round(
            sphere7.position.y
          )},${Math.round(sphere7.position.z)} | Distance: ${Math.round(sphere7Distance)}`;
        }

        // Vérifier Sphere 8 avec hysteresis pour éviter le clignotement
        if (sphere8) {
          const sphere8Distance = Math.abs(sphere8.position.y - -1000);
          
          // Hysteresis : plus strict pour activer (±3), plus tolérant pour désactiver (±8)
          if (!previousSphere8State && sphere8Distance < 3) {
            sphere8Near = true; // Activation stricte
          } else if (previousSphere8State && sphere8Distance < 8) {
            sphere8Near = true; // Maintien avec tolérance
          } else {
            sphere8Near = false;
          }
          
          previousSphere8State = sphere8Near;
          sphere8Status = `${
            sphere8Near ? "ACTIVE (y≈-1000)" : "INACTIVE"
          } | Position: ${Math.round(sphere8.position.x)},${Math.round(
            sphere8.position.y
          )},${Math.round(sphere8.position.z)} | Distance: ${Math.round(sphere8Distance)}`;
        }

        // Vérifier Camera Chog - STRICTEMENT y=167.30 (±2 tolérance)
        if (cameraChog) {
          cameraChogActive = Math.abs(cameraChog.position.y - 167.3) < 2;
          cameraChogStatus = `${
            cameraChogActive ? "TRIGGER (y≈167.30)" : "IDLE"
          } | Position: ${Math.round(cameraChog.position.x)},${
            Math.round(cameraChog.position.y * 100) / 100
          },${Math.round(cameraChog.position.z)}`;

          // Simuler touche C si Camera Chog vient d'atteindre la position et ce n'était pas le cas avant
          if (cameraChogActive && !previousCameraChogState) {
            console.log("🎯 Camera Chog activated - triggering C key");
            simulateKeyC();
          }
          previousCameraChogState = cameraChogActive;
        }

        // Vérifier Camera Yaki - STRICTEMENT x=-17427.21 (±50 tolérance)
        if (camera) {
          const cameraDistance = Math.abs(camera.position.x - (-17427.21));
          cameraActive = cameraDistance < 50;
          cameraStatus = `${
            cameraActive ? "TRIGGER (x≈-17427)" : "IDLE"
          } | Position: ${Math.round(camera.position.x)},${Math.round(
            camera.position.y
          )},${Math.round(camera.position.z)} | Distance: ${Math.round(cameraDistance)}`;

          // Simuler touche Y si Camera Yaki vient d'atteindre la position et ce n'était pas le cas avant
          if (cameraActive && !previousCameraState) {
            console.log("🎯 Camera Yaki activated - triggering Y key");
            simulateKeyY();
          }
          previousCameraState = cameraActive;
        }

        // RÈGLE STRICTE avec stabilisation : Discovery accessible UNIQUEMENT si Sphere 5 OU Sphere 7 OU Sphere 8 est à y=-1000
        const newDiscoveryState = sphere5Near || sphere7Near || sphere8Near;
        
        // Stabilisation pour éviter le clignotement du Discovery modal
        // Ne change l'état que si c'est différent pendant au moins 2 vérifications
        if (newDiscoveryState !== stableDiscoveryState) {
          // On peut changer l'état immédiatement, l'hysteresis des sphères assure déjà la stabilité
          stableDiscoveryState = newDiscoveryState;
        }

        const status = `S5: ${sphere5Status} | S7: ${sphere7Status} | S8: ${sphere8Status} | CChog: ${cameraChogStatus} | Cam: ${cameraStatus} | Discovery: ${
          stableDiscoveryState ? "ACCESSIBLE" : "BLOCKED"
        }`;
        setDebugInfo(status);
        setNearArcadeMachine(stableDiscoveryState);

        return stableDiscoveryState;
      } catch (error) {
        const errorStatus = `Error checking objects: ${error}`;
        console.warn(errorStatus);
        setDebugInfo(errorStatus);
        setNearArcadeMachine(false);
        return false;
      }
    };

    // Vérification initiale
    checkObjectsPosition();

    // Vérification périodique toutes les 500ms
    const proximityChecker = setInterval(() => {
      checkObjectsPosition();
    }, 500);

    // Nettoyer l'intervalle
    return () => {
      clearInterval(proximityChecker);
    };
  }

  // Fonction de test pour simuler X
  function testSimulateX() {
    console.log("🧪 TEST: Simulating X key manually...");

    const variations = [
      { key: "x", code: "KeyX" },
      { key: "X", code: "KeyX" },
      { key: "x", code: "keyX" },
      { key: "x", code: "Key88" },
    ];

    variations.forEach((variant, index) => {
      setTimeout(() => {
        console.log(`🧪 Testing variant ${index + 1}:`, variant);

        const keyDownEvent = new KeyboardEvent("keydown", {
          key: variant.key,
          code: variant.code,
          keyCode: 88,
          which: 88,
          bubbles: true,
          cancelable: true,
          composed: true,
        });

        const keyUpEvent = new KeyboardEvent("keyup", {
          key: variant.key,
          code: variant.code,
          keyCode: 88,
          which: 88,
          bubbles: true,
          cancelable: true,
          composed: true,
        });

        document.dispatchEvent(keyDownEvent);
        document.body.dispatchEvent(keyDownEvent);
        window.dispatchEvent(keyDownEvent);

        setTimeout(() => {
          document.dispatchEvent(keyUpEvent);
          document.body.dispatchEvent(keyUpEvent);
          window.dispatchEvent(keyUpEvent);
        }, 50);
      }, index * 200);
    });
  }

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        margin: 0,
        padding: 0,
        overflow: "hidden",
      }}
    >
      {/* Spline plein écran */}
      <Spline
        scene="https://prod.spline.design/cZ45U4dQLe-IB-pq/scene.splinecode"
        onLoad={onLoad}
        renderOnDemand={false}
        style={{
          width: "100vw",
          height: "100vh",
          position: "absolute",
          top: 0,
          left: 0,
          margin: 0,
          padding: 0,
        }}
      />

      {/* Debug Overlay */}
      {mounted && process.env.NODE_ENV === "development" && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1000,
            background: "rgba(0,0,0,0.8)",
            color: "white",
            padding: "10px 15px",
            borderRadius: "8px",
            fontSize: "12px",
            fontFamily: "monospace",
            maxWidth: "500px",
            textAlign: "center",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
            🔍 Détection de proximité
          </div>
          <div>{debugInfo}</div>
          {preloadStatus && (
            <div
              style={{ marginTop: "3px", fontSize: "10px", color: "#60a5fa" }}
            >
              {preloadStatus}
            </div>
          )}
          <div style={{ marginTop: "5px", fontSize: "10px", opacity: 0.7 }}>
            Distance Event → Sphere 5 → Modal Discovery
          </div>
        </div>
      )}

      {/* Overlay buttons */}
      {mounted && (
        <>
          {/* Bouton Discovery en haut à gauche */}
          <div
            style={{
              position: "absolute",
              top: "80px", // Décalé pour éviter le debug overlay
              left: "20px",
              zIndex: 1000,
            }}
          >
            <button
              onClick={() => {
                if (nearArcadeMachine) {
                  setDiscoveryOpen(true);
                } else {
                  console.log("🚫 Discovery blocked - Not near Arcade Machine");
                }
              }}
              disabled={!nearArcadeMachine}
              style={{
                background: nearArcadeMachine
                  ? "rgba(0,100,255,0.9)"
                  : "rgba(100,100,100,0.5)",
                color: nearArcadeMachine ? "white" : "rgba(255,255,255,0.5)",
                border: "none",
                padding: "12px 16px",
                borderRadius: "25px",
                fontSize: "14px",
                fontWeight: "bold",
                cursor: nearArcadeMachine ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: nearArcadeMachine
                  ? "0 4px 12px rgba(0,100,255,0.3)"
                  : "0 2px 6px rgba(100,100,100,0.2)",
                transition: "all 0.3s ease",
                opacity: nearArcadeMachine ? 1 : 0.6,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(0,100,255,0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(0,100,255,0.3)";
              }}
            >
              🔍{" "}
              {nearArcadeMachine
                ? "Découvrir dApps"
                : "Approchez-vous de l'Arcade"}
              <span style={{ fontSize: "10px", opacity: 0.8 }}>
                {nearArcadeMachine ? "(D)" : ""}
              </span>
            </button>
          </div>

          {/* Bouton disconnect en haut à droite si connecté */}
          {isConnected && (
            <div
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  background: "rgba(0,0,0,0.7)",
                  color: "white",
                  padding: "8px 12px",
                  borderRadius: "20px",
                  fontSize: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <button
                  onClick={() => {
                    disconnect();
                    setSigned(false);
                    if (address) {
                      localStorage.removeItem(`sherlock_auth_${address}`);
                    }
                  }}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    color: "white",
                    border: "none",
                    padding: "2px 6px",
                    borderRadius: "10px",
                    fontSize: "10px",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          )}
          {/* Bouton Connect Wallet en bas */}
          <div
            style={{
              position: "absolute",
              bottom: "30px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
            }}
          >
            {!isConnected ? (
              <button
                onClick={() => setModalOpen(true)}
                style={{
                  background: "rgba(0,0,0,0.8)",
                  color: "white",
                  border: "none",
                  padding: "12px 24px",
                  borderRadius: "25px",
                  cursor: "pointer",
                }}
              >
                Connect Wallet
              </button>
            ) : !signed ? (
              <div
                style={{
                  background: "rgba(255,165,0,0.9)",
                  color: "white",
                  padding: "12px 24px",
                  borderRadius: "25px",
                }}
              >
                Please sign message...
              </div>
            ) : null}
          </div>
        </>
      )}

      {/* LoginModal */}
      <LoginModal
        open={modalOpen}
        requireSignature={!signed}
        onClose={() => {
          if (!signed && isConnected) return;
          setModalOpen(false);
        }}
        onSigned={(sig) => {
          if (address) {
            localStorage.setItem(`sherlock_auth_${address}`, sig);
          }
          setSigned(true);
          setModalOpen(false);

          // Déclencher simulation X juste après signature
          console.log(
            "✅ Personal sign completed - triggering camera movement"
          );
          setTimeout(() => {
            testSimulateX();
          }, 1500);
        }}
      />

      {/* DiscoveryModal */}
      <DiscoveryModal
        isOpen={discoveryOpen}
        onClose={() => setDiscoveryOpen(false)}
        simulateKeyM={simulateKeyM}
      />
    </div>
  );
}

export default function App() {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={queryClient}>
        <SplinePage />
      </QueryClientProvider>
    </WagmiConfig>
  );
}
