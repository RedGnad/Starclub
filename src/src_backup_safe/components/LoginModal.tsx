import React from "react";
import {
  useConnect,
  useDisconnect,
  useAccount,
  useSignMessage,
  useNetwork,
  useSwitchNetwork,
} from "wagmi";
import { monadTestnet } from "../wagmi";
import { buildSiweMessage, getBrowserContext } from "../lib/siwe";
import {
  getNonce,
  verifySignatureLocally,
  verifySignatureOnServer,
} from "../lib/authClient";

interface LoginModalProps {
  open: boolean;
  onClose: () => void;
  onSigned: (signature: string) => void;
  requireSignature?: boolean; // when true, modal acts as a blocking gate until signature success
}

const FALLBACK_MESSAGE = "Sherlock access login (fallback)";

export function LoginModal({
  open,
  onClose,
  onSigned,
  requireSignature,
}: LoginModalProps) {
  const requireServerVerify = false; // Désactivé temporairement car pas de serveur SIWE
  const { isConnected, address } = useAccount();
  const { chain } = useNetwork();
  const chainId = chain?.id ?? monadTestnet.id;
  const [connectLock, setConnectLock] = React.useState<string | null>(null);
  const { connect, isLoading: isPending, error: connectError, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const {
    switchNetwork: switchChain,
    isLoading: switching,
    error: switchError,
  } = useSwitchNetwork();
  const {
    signMessage,
    data: signature,
    isLoading: signing,
    error: signError,
    reset: resetSign,
    isSuccess,
  } = useSignMessage();
  const signRequestedRef = React.useRef(false);
  const gateActiveRef = React.useRef(false);
  const autoSwitchTriedRef = React.useRef(false);
  const [signStartTs, setSignStartTs] = React.useState<number | null>(null);
  const [retryFlag, setRetryFlag] = React.useState(false);
  const [nonce, setNonce] = React.useState<string | null>(null);
  const [dynamicMessage, setDynamicMessage] = React.useState<string | null>(
    null
  );
  const [localVerifyError, setLocalVerifyError] = React.useState<string | null>(
    null
  );
  const [serverVerifying, setServerVerifying] = React.useState(false);

  // Reset & prepare SIWE message on open/connect
  React.useEffect(() => {
    let cancelled = false;
    async function prep() {
      if (!open) return;
      signRequestedRef.current = false;
      gateActiveRef.current = false;
      autoSwitchTriedRef.current = false;
      setConnectLock(null); // Reset connection lock
      resetSign();
      setLocalVerifyError(null);
      setDynamicMessage(null);
      setNonce(null);
      if (isConnected && address) {
        try {
          const n = await getNonce();
          if (cancelled) return;
          setNonce(n);
          const { domain, uri } = getBrowserContext();
          const msg = buildSiweMessage({
            domain,
            address,
            uri,
            chainId: chainId,
            nonce: n,
          });
          setDynamicMessage(msg);
        } catch (error: any) {
          console.warn("Failed to get nonce:", error.message);
          // Utiliser un fallback sans nonce pour éviter l'erreur 404
          const { domain, uri } = getBrowserContext();
          const fallbackNonce = Math.random().toString(36).substring(7);
          const msg = buildSiweMessage({
            domain,
            address,
            uri,
            nonce: fallbackNonce,
            chainId: monadTestnet.id,
          });
          setDynamicMessage(msg);
          setNonce(fallbackNonce);
        }
      }
    }
    prep();
    return () => {
      cancelled = true;
    };
  }, [open, resetSign, isConnected, address, chainId]);

  // If connected on wrong network while modal is open, auto-attempt one switch to Monad Testnet
  React.useEffect(() => {
    if (!open) return;
    if (
      isConnected &&
      chainId !== monadTestnet.id &&
      !autoSwitchTriedRef.current &&
      switchChain
    ) {
      autoSwitchTriedRef.current = true;
      console.log("Auto-switching to Monad Testnet...");
      
      // Délai pour laisser la connexion se stabiliser
      setTimeout(async () => {
        try {
          await switchChain(monadTestnet.id);
          console.log("Successfully switched to Monad Testnet");
        } catch (error: any) {
          console.warn("Auto-switch failed:", error.message);
          // Ne pas bloquer l'utilisateur, il peut switcher manuellement
        }
      }, 1000);
    }
    if (chainId === monadTestnet.id) {
      // allow another attempt if user manually changed back
      autoSwitchTriedRef.current = false;
    }
  }, [open, isConnected, chainId, switchChain]);

  // Remove obsolete post-sign switch handler (was used in previous flow)

  // Gestion du curseur pendant la signature
  React.useEffect(() => {
    if (signing) {
      document.body.classList.add('signing-in-progress');
    } else {
      document.body.classList.remove('signing-in-progress');
    }
    
    // Cleanup au démontage du composant
    return () => {
      document.body.classList.remove('signing-in-progress');
    };
  }, [signing]);

  // When signature succeeds, perform local verification before closing.
  React.useEffect(() => {
    async function finalize() {
      if (
        !(open && signRequestedRef.current && isSuccess && signature && address)
      )
        return;
      const msgToVerify = dynamicMessage || FALLBACK_MESSAGE;
      const local = verifySignatureLocally(address, msgToVerify, signature);
      if (!local) {
        setLocalVerifyError("Local verify failed");
        return; // keep modal open so user can retry
      }
      // Server verify (SIWE) – optional in dev unless VITE_SIWE_REQUIRE_SERVER=true
      if (requireServerVerify) {
        setServerVerifying(true);
        const server = await verifySignatureOnServer(address, msgToVerify, signature);
        if (!server.success) {
          setServerVerifying(false);
          setLocalVerifyError(server.error || "Server verify failed");
          return;
        }
      }
      gateActiveRef.current = false;
      
      // S'assurer que le curseur se reset à la fermeture
      document.body.classList.remove('signing-in-progress');
      
      onSigned(signature);
      onClose();
    }
    finalize();
  }, [open, isSuccess, signature, address, dynamicMessage, onSigned, onClose]);

  // Debug des wallets disponibles (dev seulement)
  React.useEffect(() => {
    if (open && process.env.NODE_ENV === 'development') {
      console.log("🔍 Available wallets:", connectors.map(c => c.name).join(", "));
      console.log("🔍 Total connectors:", connectors.length);
      
      if (typeof window !== 'undefined') {
        // Debug complet de Haha
        console.log("=== HAHA DEBUG ===");
        console.log("window.haha exists:", !!(window as any).haha);
        console.log("window.ethereum.isHaha:", (window as any).ethereum?.isHaha);
        
        if ((window as any).haha) {
          console.log("window.haha type:", typeof (window as any).haha);
          console.log("window.haha.ethereum:", !!(window as any).haha.ethereum);
          console.log("window.haha.request:", typeof (window as any).haha.request);
          console.log("window.haha keys:", Object.keys((window as any).haha));
        }
        
        // Tester le connector Haha
        const hahaConnector = connectors.find(c => c.name === "Haha");
        if (hahaConnector) {
          console.log("✅ Haha connector found!");
          try {
            const provider = hahaConnector.options?.getProvider?.();
            console.log("Haha provider result:", !!provider, typeof provider);
          } catch (e) {
            console.log("Haha provider error:", e);
          }
        } else {
          console.log("❌ Haha connector NOT found in list");
        }
        console.log("=== END HAHA DEBUG ===");
      }
    }
  }, [open, connectors]);

  if (!open) {
    // S'assurer que le curseur se reset quand le modal se ferme
    document.body.classList.remove('signing-in-progress');
    return null;
  }

  const hasInjected =
    typeof window !== "undefined" && !!(window as any).ethereum;

  // Verrouillage strict: dès qu'un wallet est connecté (écran de sign-in),
  // on bloque la fermeture du modal (clic dehors / croix). "Disconnect" reste possible.
  // Cela évite toute désynchronisation avec des états externes.
  const lockClose = isConnected;
  // On conserve une notion d'activité de gate pour l'UI (état de signature/vérif)
  const signingGateActive = lockClose && (!isSuccess || serverVerifying);
  gateActiveRef.current = lockClose;

  return (
    <div
      style={styles.backdrop}
      onClick={(e) => {
        // Autoriser la fermeture uniquement si pas de lock
        if (!lockClose) onClose();
      }}
    >
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.title}>Connect wallet</h2>
        {!isConnected ? (
          <div style={styles.section}>
            <div style={{ display: "grid", gap: 8 }}>
              {connectors.map((c) => {
                const locked = !!connectLock && connectLock !== c.id;
                const disabled = isPending || locked;
                return (
                  <button
                    key={c.id}
                    onClick={async () => {
                      if (disabled) return;
                      setConnectLock(c.id);
                      
                      try {
                        // Vérifier si le provider du connector est disponible
                        const provider = c.options?.getProvider?.();
                        if (!provider) {
                          throw new Error(`${c.name} wallet is not installed or not available`);
                        }
                        
                        // Request connect on Monad Testnet directly
                        await connect({ connector: c, chainId: monadTestnet.id });
                      } catch (error: any) {
                        console.error(`Connection failed for ${c.name}:`, error);
                        // Afficher une erreur utilisateur plus claire
                        if (error.message?.includes('not installed') || error.message?.includes('not available')) {
                          // Ici on pourrait ajouter un état d'erreur spécifique
                        }
                      } finally {
                        // Release lock shortly after to allow wallet UI to appear without immediate spam
                        setTimeout(() => setConnectLock(null), 500);
                      }
                    }}
                    disabled={disabled}
                    aria-busy={disabled}
                    style={buttonStyle(disabled)}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
            {connectError && (
              <div style={styles.error}>
                Connection error: {connectError.message}
                {connectError.message?.includes(
                  "wallet_requestPermissions"
                ) && (
                  <div style={{ marginTop: 6 }}>
                    A request is already open in your wallet. Approve or close
                    the popup, then try again.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={styles.section}>
            <div style={styles.connectedBox}>
              <div style={{ color: "#111", fontWeight: 500 }}>Address</div>
              <div style={styles.address}>{address}</div>
            </div>
            {chainId !== monadTestnet.id && (
              <div
                style={{
                  display: "grid",
                  gap: 10,
                  padding: 12,
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  background: "#fff7ed",
                  color: "#9a3412",
                }}
              >
                <div style={{ fontWeight: 600 }}>Wrong network</div>
                <div>Please switch to Monad Testnet to continue.</div>
                <button
                  onClick={() => switchChain?.(monadTestnet.id)}
                  disabled={switching}
                  style={buttonStyle(switching)}
                >
                  {switching ? "Switching…" : "Switch to Monad Testnet"}
                </button>
                {switchError && (
                  <div style={styles.error}>
                    Switch error: {switchError.message}
                  </div>
                )}
              </div>
            )}
            <div style={styles.actionsRow}>
              <button
                onClick={() => {
                  // Clear signature state and allow re-selection
                  resetSign();
                  signRequestedRef.current = false;
                  setConnectLock(null); // Reset connection lock
                  setLocalVerifyError(null); // Clear errors
                  disconnect();
                }}
                style={outlineButtonStyle}
              >
                Disconnect
              </button>
              <button
                onClick={() => {
                  if (chainId !== monadTestnet.id) {
                    try {
                      switchChain?.(monadTestnet.id);
                    } catch {}
                    return;
                  }
                  signRequestedRef.current = true;
                  if (address) {
                    try {
                      localStorage.setItem(`sherlock_pending_${address}`, "1");
                    } catch {}
                  }
                  setRetryFlag(false);
                  setSignStartTs(Date.now());
                  signMessage({ message: dynamicMessage || FALLBACK_MESSAGE });
                }}
                disabled={
                  signing || chainId !== monadTestnet.id || !dynamicMessage
                }
                style={buttonStyle(signing)}
              >
                {signing
                  ? "Signing…"
                  : dynamicMessage
                  ? "Sign to continue"
                  : "Preparing…"}
              </button>
              {signing && signStartTs && Date.now() - signStartTs > 15000 && (
                <div style={{ fontSize: 12, color: "#9a3412" }}>
                  Signature taking longer than usual. You can retry.
                  <div style={{ marginTop: 6 }}>
                    <button
                      onClick={() => {
                        resetSign();
                        setRetryFlag(true);
                        setSignStartTs(Date.now());
                        signMessage({
                          message: dynamicMessage || FALLBACK_MESSAGE,
                        });
                      }}
                      style={outlineButtonStyle}
                    >
                      Retry signature
                    </button>
                  </div>
                </div>
              )}
              {retryFlag && !signing && !isSuccess && !signError && (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Retry initiated. Await wallet popup…
                </div>
              )}
            </div>
            {(serverVerifying || signError || localVerifyError) && (
              <div
                style={{
                  ...styles.error,
                  color: serverVerifying ? "#6b7280" : styles.error.color,
                }}
              >
                {serverVerifying && "Verifying signature on server…"}
                {signError && <div>Signature error: {signError.message}</div>}
                {localVerifyError && <div>Auth error: {localVerifyError}</div>}
              </div>
            )}
          </div>
        )}
        {!lockClose && (
          <button
            onClick={() => {
              onClose();
            }}
            style={styles.close}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(30, 30, 60, 0.2))",
    backdropFilter: "blur(12px) saturate(150%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))",
    backdropFilter: "blur(20px) saturate(180%)",
    borderRadius: 20,
    padding: "32px 36px 40px",
    width: "400px",
    boxShadow: `
      0 0 0 1px rgba(255, 255, 255, 0.2),
      0 25px 50px -12px rgba(0, 0, 0, 0.4)
    `,
    border: "1px solid rgba(255, 255, 255, 0.2)",
    position: "relative",
    display: "grid",
    gap: 24,
    color: "#fff",
    fontSize: 14,
    animation: "glass-login-appear 0.4s ease-out",
  },
  title: { margin: 0, fontSize: 22, fontWeight: 600, color: "#fff" },
  section: { display: "grid", gap: 16, color: "#fff" },
  note: { color: "rgba(255, 255, 255, 0.7)", fontSize: 12 },
  connectedBox: { display: "grid", gap: 6, fontSize: 14, color: "#fff" },
  address: {
    fontFamily: "monospace",
    fontSize: 13,
    wordBreak: "break-all",
    color: "rgba(255, 255, 255, 0.9)",
    background: "rgba(255, 255, 255, 0.1)",
    padding: "8px 12px",
    borderRadius: 8,
    backdropFilter: "blur(8px)",
  },
  actionsRow: { display: "flex", gap: 12, flexWrap: "wrap", color: "#fff" },
  error: { color: "#ff6b6b", fontSize: 13, fontWeight: 500 },
  close: {
    position: "absolute",
    top: 12,
    right: 14,
    background: "rgba(255, 255, 255, 0.1)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    cursor: "pointer",
    lineHeight: 1,
    color: "#fff",
    backdropFilter: "blur(8px)",
    transition: "all 0.2s ease",
  },
};

function buttonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #333",
    background: disabled ? "#666" : "#111",
    color: disabled ? "#999" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    fontWeight: 500,
    transition: "all 0.2s ease",
    boxShadow: disabled 
      ? "none"
      : "0 2px 8px rgba(0, 0, 0, 0.3)",
  };
}

const outlineButtonStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderRadius: 12,
  border: "1px solid #555",
  background: "#222",
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
  transition: "all 0.2s ease",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
};

// Ajouter les styles CSS pour les animations liquid glass et fix curseur
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes glass-login-appear {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(20px);
        backdrop-filter: blur(0px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
        backdrop-filter: blur(20px);
      }
    }
    
    /* Fix pour le curseur disabled qui reste */
    body {
      cursor: auto !important;
    }
    
    body.signing-in-progress {
      cursor: wait !important;
    }
  `;
  document.head.appendChild(styleSheet);
}
