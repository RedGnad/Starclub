import React from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { useNavigate } from "react-router";
import { LoginModal } from "../components/LoginModal";

export function meta() {
  return [
    { title: "Connect Wallet" },
    { name: "description", content: "Login with EVM wallet (wagmi)" },
  ];
}

export default function Login() {
  const navigate = useNavigate();
  const { address, isConnected, chain } = useAccount();
  const { connect, isPending, error } = useConnect();
  const hasInjected =
    typeof window !== "undefined" && !!(window as any).ethereum;
  const { disconnect } = useDisconnect();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [signed, setSigned] = React.useState(false);

  React.useEffect(() => {
    if (isConnected && address) {
      const key = `sherlock_auth_${address}`;
      setSigned(!!localStorage.getItem(key));
      // Auto-open modal if connected but not signed (gating on refresh)
      const pendingKey = `sherlock_pending_${address}`;
      if (!localStorage.getItem(key)) {
        setModalOpen(true);
      } else {
        // Clear any stale pending flag after successful auth
        localStorage.removeItem(pendingKey);
      }
    } else {
      setSigned(false);
    }
  }, [isConnected, address]);

  return (
    <main className="pt-16 p-4 container mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold mb-4">
        Wallet Login
      </h1>

      {isConnected ? (
        <div className="grid gap-3">
          <div>
            <div>Connected</div>
            <div className="font-mono">{address}</div>
            {chain?.name && <div>Network: {chain.name}</div>}
          </div>
          {signed ? (
            <div className="text-green-600">Access granted (signed)</div>
          ) : (
            <div className="text-gray-500">
              Signature required to access the app.
            </div>
          )}
          <button
            onClick={() => {
              if (address) {
                // Clear authentication data
                localStorage.removeItem(`sherlock_auth_${address}`);
                localStorage.removeItem(`sherlock_pending_${address}`);
              }
              disconnect();
              // Redirect to login page after disconnect
              navigate("/login");
            }}
            className="py-2.5 px-3.5 rounded-[10px] border border-gray-300 bg-gray-50 text-gray-900 cursor-pointer w-fit hover:bg-gray-100 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          <button
            onClick={() => setModalOpen(true)}
            className="py-2.5 px-3.5 rounded-[10px] border border-gray-300 bg-gray-900 text-white cursor-pointer w-fit hover:bg-gray-800 transition-colors"
          >
            Connect Wallet
          </button>
          {error && (
            <div className="text-red-700">Error: {error.message}</div>
          )}
        </div>
      )}

      <LoginModal
        open={modalOpen}
        requireSignature={!signed}
        onClose={() => {
          // Autoriser fermeture si wallet non connecté (choix des wallets)
          // Bloquer seulement quand connecté et signature requise non encore réalisée
          if (!signed && isConnected) return;
          setModalOpen(false);
        }}
        onSigned={(sig) => {
          if (address) {
            localStorage.setItem(`sherlock_auth_${address}`, sig);
            localStorage.removeItem(`sherlock_pending_${address}`);
          }
          setSigned(true);
          setModalOpen(false);
          // Redirect to home after successful authentication
          navigate("/home");
        }}
      />
    </main>
  );
}
