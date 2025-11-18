// Composant de test pour vérifier la connexion Backend
// À utiliser temporairement pour valider l'intégration

import React from 'react';
import { useAccount } from 'wagmi';
import { 
  useBackendHealth, 
  useWalletVerification, 
  useSuperDApps,
  useUserInteractions 
} from '../hooks/useStarclubAPI';

export function BackendTest() {
  const { address, isConnected } = useAccount();
  const { health, loading: healthLoading } = useBackendHealth();
  const { verificationData, loading: verifyLoading, refetch: refetchVerification } = useWalletVerification(address);
  const { dapps, loading: dappsLoading } = useSuperDApps();
  const { interactions, loading: interactionsLoading, refetch: refetchInteractions } = useUserInteractions(address);

  const handleRefreshActivity = () => {
    if (address) {
      refetchVerification();
      refetchInteractions();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontSize: '12px',
      maxWidth: '300px',
      zIndex: 1000
    }}>
      <h3 style={{ margin: '0 0 10px 0', color: '#00ff88' }}>🧪 Backend Test Panel</h3>
      
      {/* Backend Health */}
      <div style={{ marginBottom: '10px' }}>
        <strong>🏥 Backend Health:</strong>
        {healthLoading ? (
          <span style={{ color: 'yellow' }}> Testing...</span>
        ) : health?.connected ? (
          <span style={{ color: '#00ff88' }}> ✅ Connected</span>
        ) : (
          <span style={{ color: 'red' }}> ❌ Disconnected</span>
        )}
      </div>

      {/* Wallet Info */}
      <div style={{ marginBottom: '10px' }}>
        <strong>👛 Wallet:</strong>
        {isConnected ? (
          <div>
            <span style={{ color: '#00ff88' }}> ✅ Connected</span>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
            <div style={{ fontSize: '9px', opacity: 0.5, marginTop: '2px' }}>
              Full: {address}
            </div>
          </div>
        ) : (
          <span style={{ color: 'orange' }}> ⚠️ Not connected</span>
        )}
      </div>

      {/* Wallet Verification */}
      {isConnected && (
        <div style={{ marginBottom: '10px' }}>
          <strong>🔍 BlockVision Check:</strong>
          {verifyLoading ? (
            <span style={{ color: 'yellow' }}> Checking...</span>
          ) : verificationData ? (
            <div>
              <div style={{ color: verificationData.verified ? '#00ff88' : 'orange' }}>
                {verificationData.verified ? ' ✅ Active' : ' ⚠️ No activity'}
              </div>
              <div style={{ fontSize: '10px', opacity: 0.7 }}>
                Transactions: {verificationData.transactionCount || 0}
              </div>
            </div>
          ) : (
            <span style={{ color: 'gray' }}> No data</span>
          )}
        </div>
      )}

      {/* SuperDApps */}
      <div style={{ marginBottom: '10px' }}>
        <strong>🌟 SuperDApps:</strong>
        {dappsLoading ? (
          <span style={{ color: 'yellow' }}> Loading...</span>
        ) : (
          <div>
            <span style={{ color: '#00ff88' }}> ✅ {dapps.length} loaded</span>
            {dapps.slice(0, 2).map(dapp => (
              <div key={dapp.id} style={{ fontSize: '10px', opacity: 0.7 }}>
                • {dapp.name} ({dapp.contractCount} contracts)
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Interactions */}
      {isConnected && (
        <div style={{ marginBottom: '10px' }}>
          <strong>🔗 Interactions:</strong>
          {interactionsLoading ? (
            <span style={{ color: 'yellow' }}> Checking...</span>
          ) : interactions ? (
            <div>
              <span style={{ color: '#00ff88' }}>
                ✅ {interactions.totalDappsInteracted || 0} dApps
              </span>
              <div style={{ fontSize: '10px', opacity: 0.7 }}>
                Duration: {interactions.checkDuration}ms
              </div>
            </div>
          ) : (
            <span style={{ color: 'gray' }}> No data</span>
          )}
        </div>
      )}

      {/* Bouton Refresh Activity */}
      {isConnected && (
        <button
          onClick={handleRefreshActivity}
          style={{
            backgroundColor: '#00ff88',
            color: '#000',
            border: 'none',
            padding: '6px 12px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            marginTop: '10px',
            width: '100%'
          }}
        >
          🔄 Refresh Activity
        </button>
      )}

      <div style={{ fontSize: '10px', opacity: 0.5, marginTop: '10px' }}>
        Backend: localhost:4000
      </div>
    </div>
  );
}
