import React, { useState, useEffect } from 'react';
import { useUserInteractions } from '../hooks/useStarclubAPI';
import { useAccount } from 'wagmi';

interface MissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDapp: any;
  onTrigger: () => void;
}

export function MissionModal({ isOpen, onClose, selectedDapp, onTrigger }: MissionModalProps) {
  const [hasTriggered, setHasTriggered] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [missionComplete, setMissionComplete] = useState(false);
  const [initialInteractionCount, setInitialInteractionCount] = useState(0);
  
  const { address } = useAccount();
  const { interactions, refetch: refetchInteractions } = useUserInteractions(address);
  
  // Type assertion pour éviter les erreurs TypeScript
  const userInteractions = interactions as any;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('🎯 Mission modal opened for dapp:', selectedDapp?.name);
      setHasTriggered(false);
      setIsVerifying(false);
      setMissionComplete(false);
      
      // FORCER un refetch pour avoir les données de base à jour
      // (pas pour vérifier la mission, mais pour avoir le count initial correct)
      console.log('🔄 Getting current interaction count as baseline...');
      refetchInteractions().then(() => {
        console.log('✅ Baseline data loaded');
      });
      
      // Attendre un peu puis stocker le count initial (baseline)
      setTimeout(() => {
        console.log('📊 Setting baseline interaction count:', userInteractions);
        
        // Store initial interaction count as BASELINE
        if (userInteractions && userInteractions.interactions) {
          console.log('📊 Available interactions for baseline:', userInteractions.interactions.map((i: any) => ({
            dappName: i.dappName,
            transactionCount: i.transactionCount
          })));
          
          const dappInteraction = userInteractions.interactions.find(
            (i: any) => i.dappName?.toLowerCase() === selectedDapp?.name?.toLowerCase()
          );
          
          console.log('🎯 Baseline interaction for selected dapp:', dappInteraction);
          
          const baselineCount = dappInteraction?.transactionCount || 0;
          setInitialInteractionCount(baselineCount);
          console.log('📈 Baseline interaction count set to:', baselineCount, '(this is BEFORE visiting the dApp)');
        } else {
          console.log('📊 No existing interactions - baseline set to 0');
          setInitialInteractionCount(0);
        }
      }, 1000);
    }
  }, [isOpen, selectedDapp, refetchInteractions]);

  const handleVisitDapp = () => {
    if (selectedDapp?.website) {
      setHasTriggered(true);
      onTrigger();
      window.open(selectedDapp.website, '_blank');
    }
  };

  const handleVerifyMission = async () => {
    if (!hasTriggered) return;
    
    setIsVerifying(true);
    
    try {
      console.log('🔍 Starting mission verification for:', selectedDapp?.name);
      console.log('📊 Initial interaction count:', initialInteractionCount);
      
      // Fonction de retry avec délai progressif
      const verifyWithRetry = async (attempt = 1, maxAttempts = 3) => {
        console.log(`🔄 Verification attempt ${attempt}/${maxAttempts}`);
        
        await refetchInteractions();
        
        // Délai progressif : 2s, 4s, 6s
        const delay = attempt * 2000;
        console.log(`⏳ Waiting ${delay/1000}s for blockchain indexation...`);
        
        return new Promise((resolve) => {
          setTimeout(() => {
            console.log('🔄 User interactions after refetch (RAW):', userInteractions);
            console.log('🔄 User interactions type:', typeof userInteractions);
            console.log('🔄 User interactions keys:', userInteractions ? Object.keys(userInteractions) : 'null');
            
            // Essayer différentes structures possibles
            const interactionsArray = userInteractions?.interactions || 
                                     userInteractions?.data?.interactions || 
                                     userInteractions;
            
            console.log('🔄 Interactions array found:', interactionsArray);
            console.log('🔄 Interactions array type:', typeof interactionsArray);
            console.log('🔄 Interactions array length:', Array.isArray(interactionsArray) ? interactionsArray.length : 'not array');
            
            if (interactionsArray && Array.isArray(interactionsArray)) {
              console.log('📋 Available interactions:', interactionsArray.map((i: any) => ({
                dappName: i.dappName,
                transactionCount: i.transactionCount
              })));
              
              const dappInteraction = interactionsArray.find(
                (i: any) => i.dappName?.toLowerCase() === selectedDapp?.name?.toLowerCase()
              );
              
              console.log('🎯 Found interaction for selected dapp:', dappInteraction);
              
              const currentCount = dappInteraction?.transactionCount || 0;
              
              console.log('📈 Current count vs initial:', currentCount, 'vs', initialInteractionCount);
              
              if (currentCount > initialInteractionCount) {
                console.log('✅ MISSION COMPLETE! Setting missionComplete to true');
                setMissionComplete(true);
                resolve(true);
              } else if (attempt < maxAttempts) {
                console.log(`⏳ No new interactions yet, retrying in ${(attempt + 1) * 2}s... (attempt ${attempt + 1}/${maxAttempts})`);
                resolve(verifyWithRetry(attempt + 1, maxAttempts));
              } else {
                console.log('❌ No new interactions detected after all attempts');
                resolve(false);
              }
            } else if (attempt < maxAttempts) {
              console.log(`❌ No valid interactions array, retrying... (attempt ${attempt + 1}/${maxAttempts})`);
              resolve(verifyWithRetry(attempt + 1, maxAttempts));
            } else {
              console.log('❌ No valid interactions array found after all attempts');
              resolve(false);
            }
          }, delay);
        });
      };
      
      // Lancer la vérification avec retry
      await verifyWithRetry();
      
    } catch (error) {
      console.error('Mission verification failed:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen || !selectedDapp) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border border-white/20 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center">
          {/* Header */}
          <div className="mb-6">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Cube Mission
            </h2>
            <p className="text-gray-300 text-sm">
              Complete this mission to earn a cube!
            </p>
          </div>

          {!missionComplete ? (
            <>
              {/* Mission Description */}
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <h3 className="text-white font-semibold mb-2">Your Mission:</h3>
                <p className="text-gray-200 text-sm mb-4">
                  Interact with <span className="text-yellow-400 font-semibold">{selectedDapp.name}</span> to earn your cube!
                </p>
                <p className="text-gray-300 text-xs">
                  Visit the dApp, make a transaction, then return here to verify your mission completion.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {!hasTriggered ? (
                  <button
                    onClick={handleVisitDapp}
                    className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-black font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    🚀 Visit {selectedDapp.name}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="text-green-400 text-sm flex items-center justify-center gap-2">
                      <span>✅</span>
                      <span>Mission triggered! Complete your interaction and verify below.</span>
                    </div>
                    
                    <button
                      onClick={handleVerifyMission}
                      disabled={isVerifying}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100"
                    >
                      {isVerifying ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Verifying...
                        </div>
                      ) : (
                        '🔍 Verify Mission'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Mission Complete */
            <div className="space-y-6">
              <div className="text-6xl">🎉</div>
              <div>
                <h3 className="text-2xl font-bold text-green-400 mb-2">
                  Mission Complete!
                </h3>
                <p className="text-gray-200">
                  You've successfully interacted with {selectedDapp.name}!
                </p>
                <p className="text-yellow-400 font-semibold mt-2">
                  🧊 Cube Earned!
                </p>
              </div>
              
              <button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
              >
                🎯 Complete Mission
              </button>
            </div>
          )}

          {/* Close button */}
          {!missionComplete && (
            <button
              onClick={onClose}
              className="mt-4 text-gray-400 hover:text-white transition-colors text-sm"
            >
              Maybe later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
