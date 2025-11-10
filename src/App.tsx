import React from "react";
import { useAccount, useDisconnect } from "wagmi";
import { LoginModal } from "./components/LoginModal";
import Spline from "@splinetool/react-spline";
import type { Application } from "@splinetool/runtime";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { config } from "./wagmi";

const queryClient = new QueryClient();

function SplinePage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [signed, setSigned] = React.useState(false);
  const [splineLoaded, setSplineLoaded] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Fix hydration - wait for mount
  React.useEffect(() => {
    setMounted(true);

    // Listener pour débugger les événements clavier
    const keyListener = (e: KeyboardEvent) => {
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
    setSplineLoaded(true);
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
    <div style={{ 
      width: "100vw", 
      height: "100vh", 
      position: "relative",
      margin: 0,
      padding: 0,
      overflow: "hidden"
    }}>
      {/* Spline plein écran */}
      <Spline
        scene="https://prod.spline.design/kYLT0C1jU9GJ7Rt4/scene.splinecode"
        onLoad={onLoad}
        renderOnDemand={false}
        style={{ 
          width: "100vw", 
          height: "100vh",
          position: "absolute",
          top: 0,
          left: 0,
          margin: 0,
          padding: 0
        }}
      />

      {/* Bouton disconnect en haut à droite si connecté */}
      {mounted && isConnected && (
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

      {/* Overlay buttons */}
      {mounted && (
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
          console.log("✅ Personal sign completed - triggering camera movement");
          setTimeout(() => {
            testSimulateX();
          }, 1500);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <SplinePage />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
