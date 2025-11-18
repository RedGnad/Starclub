import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { UserInteractionsService, type UserInteractionResult } from '../services/userInteractions';

interface DAppVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DApp {
  id: string;
  name: string;
  category?: string;
  contractCount?: number;
}

export const DAppVerificationModal: React.FC<DAppVerificationModalProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const { address, isConnected } = useAccount();
  const [availableDapps, setAvailableDapps] = useState<DApp[]>([]);
  const [selectedDapp, setSelectedDapp] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<UserInteractionResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingRealData, setUsingRealData] = useState<boolean>(false);

  const userInteractionsService = UserInteractionsService.getInstance();

  // Charger les dApps disponibles à l'ouverture du modal
  useEffect(() => {
    if (isOpen) {
      loadAvailableDapps();
      setSelectedDapp(null);
      setVerificationResult(null);
      setError(null);
    }
  }, [isOpen]);

  const loadAvailableDapps = async () => {
    try {
      const dapps = await userInteractionsService.getAvailableDapps();
      setAvailableDapps(dapps);
      setUsingRealData(userInteractionsService.isUsingRealData());
    } catch (err) {
      console.error('Erreur lors du chargement des dApps:', err);
      setError('Impossible de charger les dApps disponibles');
    }
  };

  const handleVerifyInteraction = async (dappId: string) => {
    if (!address || !isConnected) {
      setError('Veuillez connecter votre wallet');
      return;
    }

    setIsChecking(true);
    setError(null);
    setSelectedDapp(dappId);

    try {
      console.log(`🔍 Vérification interaction avec dApp: ${dappId}`);
      const result = await userInteractionsService.checkUserInteractionWith24h(address, dappId);
      setVerificationResult(result);

      // Afficher le résultat dans la console pour debug
      if (result.totalDappsInteracted > 0) {
        const dapp = availableDapps.find(d => d.id === dappId);
        console.log(`✅ Interaction détectée avec ${dapp?.name}!`);
        console.log(`📊 ${result.interactions[0]?.transactionCount} transactions trouvées`);
      } else {
        console.log(`❌ Aucune interaction trouvée avec cette dApp dans les dernières 24h`);
      }

    } catch (err) {
      console.error('Erreur lors de la vérification:', err);
      setError('Erreur lors de la vérification des interactions');
    } finally {
      setIsChecking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000, // Au-dessus des autres modaux
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 20, 0.95))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        width: '500px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '16px',
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '700',
              color: '#ffffff',
            }}>
              🔍 Vérification d'Interaction dApp
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '12px',
              color: '#888',
            }}>
              Vérifiez vos interactions avec les dApps dans les dernières 24h
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: '#ffffff',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Data Source Status */}
        <div style={{
          background: usingRealData ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${usingRealData ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          borderRadius: '8px',
          padding: '8px 12px',
          marginBottom: '16px',
          fontSize: '12px',
          color: usingRealData ? '#22c55e' : '#f59e0b',
          textAlign: 'center',
        }}>
          {usingRealData ? '✅ Vérification blockchain temps réel via BlockVision API' : '⚠️ Mode fallback - Données limitées'}
        </div>

        {/* Connection Status */}
        {!isConnected && (
          <div style={{
            background: 'rgba(255, 165, 0, 0.1)',
            border: '1px solid rgba(255, 165, 0, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            color: '#ffb347',
            fontSize: '14px',
          }}>
            ⚠️ Veuillez connecter votre wallet pour vérifier les interactions
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 0, 0, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            color: '#ff6b6b',
            fontSize: '14px',
          }}>
            ❌ {error}
          </div>
        )}

        {/* Liste des dApps */}
        <div style={{ marginBottom: '16px' }}>
          <h3 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            color: '#ffffff',
          }}>
            Sélectionnez une dApp à vérifier :
          </h3>

          <div style={{ display: 'grid', gap: '8px' }}>
            {availableDapps.map(dapp => (
              <button
                key={dapp.id}
                onClick={() => handleVerifyInteraction(dapp.id)}
                disabled={!isConnected || isChecking}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: selectedDapp === dapp.id && isChecking
                    ? 'rgba(59, 130, 246, 0.2)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  cursor: (!isConnected || isChecking) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  opacity: (!isConnected || isChecking) ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (isConnected && !isChecking) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedDapp !== dapp.id || !isChecking) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }
                }}
              >
                <div>
                  <div style={{ fontWeight: '600' }}>{dapp.name}</div>
                  <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                    {dapp.category && <span>{dapp.category}</span>}
                    {dapp.contractCount && (
                      <span style={{ marginLeft: dapp.category ? '8px' : '0' }}>
                        📄 {dapp.contractCount} contrat{dapp.contractCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                
                {selectedDapp === dapp.id && isChecking && (
                  <div style={{ fontSize: '12px', color: '#60a5fa' }}>
                    Vérification...
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Résultat de vérification */}
        {verificationResult && (
          <div style={{
            background: verificationResult.totalDappsInteracted > 0 
              ? 'rgba(34, 197, 94, 0.1)' 
              : 'rgba(107, 114, 128, 0.1)',
            border: `1px solid ${verificationResult.totalDappsInteracted > 0 
              ? 'rgba(34, 197, 94, 0.3)' 
              : 'rgba(107, 114, 128, 0.3)'}`,
            borderRadius: '8px',
            padding: '16px',
          }}>
            {verificationResult.totalDappsInteracted > 0 ? (
              <>
                <div style={{ color: '#22c55e', fontWeight: '600', marginBottom: '8px' }}>
                  ✅ Interaction Blockchain Confirmée !
                </div>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                  Vérification effectuée en {verificationResult.checkDuration}ms
                </div>
                {verificationResult.interactions.map((interaction, idx) => (
                  <div key={idx} style={{ marginBottom: '12px' }}>
                    <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                      {interaction.dappName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                      • {interaction.transactionCount} transaction{interaction.transactionCount > 1 ? 's' : ''} 
                      • Dernière: {interaction.lastInteraction?.toLocaleString()}
                    </div>
                    {/* Liens Explorer */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <a
                        href={`https://testnet.monvision.io/address/${address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '11px',
                          color: '#60a5fa',
                          textDecoration: 'none',
                          padding: '2px 6px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          borderRadius: '4px',
                          border: '1px solid rgba(59, 130, 246, 0.2)',
                        }}
                      >
                        🔍 Voir ton Wallet
                      </a>
                      {interaction.contractAddresses.slice(0, 2).map((contractAddr, idx) => (
                        <a
                          key={idx}
                          href={`https://testnet.monvision.io/address/${contractAddr}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '11px',
                            color: '#8b5cf6',
                            textDecoration: 'none',
                            padding: '2px 6px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            borderRadius: '4px',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                          }}
                        >
                          📄 Contrat {idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div style={{ color: '#ef4444', fontWeight: '600', marginBottom: '8px' }}>
                  ❌ Aucune Interaction Blockchain Trouvée
                </div>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                  Aucune transaction détectée dans les dernières 24h
                </div>
                <a
                  href={`https://testnet.monvision.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '11px',
                    color: '#60a5fa',
                    textDecoration: 'none',
                    padding: '4px 8px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '4px',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    display: 'inline-block',
                  }}
                >
                  🔍 Vérifier manuellement sur l'Explorer
                </a>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '20px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '11px',
          color: '#666',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            Appuyez sur Q pour ouvrir cette vérification
          </div>
          {!usingRealData && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '4px',
              padding: '8px',
              fontSize: '10px',
              color: '#93c5fd',
            }}>
              💡 Vérification blockchain temps réel active !<br />
              <strong>Utilise :</strong> BlockVision Monad Indexing API (Production Ready)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
