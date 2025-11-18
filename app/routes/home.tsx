import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAccount, useDisconnect } from "wagmi";
import { DiscoveryModal } from "../components/DiscoveryModal";

export function meta() {
  return [
    { title: "Home - Sherlock" },
    { name: "description", content: "Welcome to Sherlock!" },
  ];
}

export default function Home() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Protect the route - redirect to login if not authenticated
  useEffect(() => {
    if (!isConnected || !address) {
      navigate("/login", { replace: true });
      return;
    }

    const authKey = `sherlock_auth_${address}`;
    const isAuthenticated = !!localStorage.getItem(authKey);

    if (!isAuthenticated) {
      navigate("/login", { replace: true });
    }
  }, [isConnected, address, navigate]);

  const handleDisconnect = () => {
    if (address) {
      // Clear authentication data
      localStorage.removeItem(`sherlock_auth_${address}`);
      localStorage.removeItem(`sherlock_pending_${address}`);
    }
    disconnect();
    navigate("/login");
  };

  return (
    <div>
      <header className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Sherlock</h1>
        <button
          onClick={handleDisconnect}
          className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 cursor-pointer text-sm hover:bg-gray-100 transition-colors"
        >
          Disconnect
        </button>
      </header>

      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 rounded-lg border-none bg-blue-500 text-white cursor-pointer text-base font-semibold transition-colors hover:bg-blue-600 flex items-center gap-2"
          >
            🔍 Découvrir les dApps
          </button>
        </div>
      </div>

      <DiscoveryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
