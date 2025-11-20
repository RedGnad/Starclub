import React, { useState, useEffect } from "react";
import { useUserInteractions } from "../hooks/useStarclubAPI";
import { useMissions } from "../hooks/useMissions";
import { useAccount } from "wagmi";

interface MissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDapp: any;
  onTrigger: () => void;
  onCubeEarned: () => void;
  onVerificationStart: (verificationInfo: any) => void;
  onVerificationUpdate: (verificationId: string, attempt: number) => void;
  onVerificationEnd: (verificationId: string) => void;
}

export function MissionModal({
  isOpen,
  onClose,
  selectedDapp,
  onTrigger,
  onCubeEarned,
  onVerificationStart,
  onVerificationUpdate,
  onVerificationEnd,
}: MissionModalProps) {
  const [hasTriggered, setHasTriggered] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [missionComplete, setMissionComplete] = useState(false);
  const [initialInteractionCount, setInitialInteractionCount] = useState(0);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const { address } = useAccount();
  const { interactions, refetch: refetchInteractions } =
    useUserInteractions(address);

  // Référence pour nettoyer les timeouts
  const verificationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Type assertion pour éviter les erreurs TypeScript
  const userInteractions = interactions as any;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && selectedDapp?.id) {
      console.log("🎯 Mission modal opened for dapp:", selectedDapp?.name);

      // Éviter les boucles infinies - vérifier si on a déjà initialisé ce dapp
      const currentModalKey = `${selectedDapp.id}_${isOpen}`;
      const lastModalKey = localStorage.getItem("last_modal_key");

      if (lastModalKey === currentModalKey) {
        console.log(
          "⚠️ Modal already initialized for this dapp, skipping reset"
        );
        return;
      }

      localStorage.setItem("last_modal_key", currentModalKey);

      // Reset COMPLET de tous les states
      setHasTriggered(false);
      setIsVerifying(false);
      setMissionComplete(false);
      setShowSuccessToast(false);

      // Nettoyer toute vérification en cours
      localStorage.removeItem("pending_verification");

      console.log("🔄 Getting REAL current count as baseline...");

      // Obtenir le count réel actuel pour ce dApp
      refetchInteractions().then(() => {
        setTimeout(async () => {
          // Appel direct API pour avoir les données fraîches
          try {
            const response = await fetch(
              `http://localhost:4000/api/user/${address}/interactions`
            );
            const result = await response.json();

            if (result.success && result.data?.interactions) {
              const dappInteraction = result.data.interactions.find(
                (i: any) =>
                  i.dappName?.toLowerCase() ===
                  selectedDapp?.name?.toLowerCase()
              );

              const currentCount = dappInteraction?.transactionCount || 0;
              setInitialInteractionCount(currentCount);

              console.log("📈 REAL baseline set:", currentCount);
              console.log("💡 Next transaction will be counted as NEW");
            } else {
              console.log("⚠️ No interactions found, baseline = 0");
              setInitialInteractionCount(0);
            }
          } catch (error) {
            console.error("Failed to get baseline:", error);
            setInitialInteractionCount(0);
          }
        }, 500);
      });
    }
  }, [isOpen, selectedDapp?.id]); // Suppression de address pour éviter les rerenders

  // SUPPRIMÉ : Ne pas nettoyer les timeouts à la fermeture
  // La vérification doit continuer même si le modal est fermé

  const handleVisitDapp = () => {
    if (selectedDapp?.website) {
      setHasTriggered(true);
      onTrigger();
      window.open(selectedDapp.website, "_blank");
    }
  };

  const handleVerifyMission = async () => {
    if (!hasTriggered) return;

    setIsVerifying(true);

    // Créer un ID unique pour cette vérification
    const verificationId = `${selectedDapp?.id}_${Date.now()}`;

    // Notifier le début de la vérification
    onVerificationStart({
      id: verificationId,
      dappName: selectedDapp?.name || "Unknown",
      startTime: Date.now(),
      attempt: 1,
      maxAttempts: 12,
    });

    try {
      console.log(
        "🔍 Starting background mission verification for:",
        selectedDapp?.name
      );
      console.log("📊 Initial interaction count:", initialInteractionCount);

      // Stocker la vérification en cours dans localStorage pour persistance
      const verificationData = {
        dappId: selectedDapp?.id,
        dappName: selectedDapp?.name,
        initialCount: initialInteractionCount,
        startTime: Date.now(),
        address: address,
      };

      localStorage.setItem(
        "pending_verification",
        JSON.stringify(verificationData)
      );
      console.log("💾 Verification stored - continues even if modal closed");

      // Fonction de vérification en arrière-plan
      const verifyInBackground = async (attempt = 1, maxAttempts = 12) => {
        console.log(
          `🔄 Background verification attempt ${attempt}/${maxAttempts} for ${selectedDapp?.name}`
        );

        // Mettre à jour le tracker
        onVerificationUpdate(verificationId, attempt);

        try {
          // Appel direct à l'API
          const response = await fetch(
            `http://localhost:4000/api/user/${address}/interactions`
          );
          const result = await response.json();

          console.log("📊 Background API response:", result);

          if (result.success && result.data) {
            const interactionsArray = result.data.interactions || [];
            console.log(
              "🔍 Background interactions array length:",
              interactionsArray.length
            );

            if (interactionsArray.length > 0) {
              const dappInteraction = interactionsArray.find(
                (i: any) =>
                  i.dappName?.toLowerCase() ===
                  selectedDapp?.name?.toLowerCase()
              );

              if (dappInteraction) {
                const currentCount = dappInteraction.transactionCount || 0;

                console.log("📈 SIMPLE CHECK:");
                console.log("  - Current count:", currentCount);
                console.log("  - Initial count:", initialInteractionCount);
                console.log(
                  "  - Has new transaction?",
                  currentCount > initialInteractionCount
                );

                // LOGIQUE SIMPLE : Si le count augmente = nouvelle transaction
                if (currentCount > initialInteractionCount) {
                  console.log(
                    "✅ SUCCESS! Count increased from",
                    initialInteractionCount,
                    "to",
                    currentCount
                  );

                  // Nettoyer le localStorage et timeout
                  localStorage.removeItem("pending_verification");
                  localStorage.removeItem("mission_baseline_timestamp");
                  if (verificationTimeoutRef.current) {
                    clearTimeout(verificationTimeoutRef.current);
                    verificationTimeoutRef.current = null;
                  }

                  // Notifier la fin de la vérification
                  onVerificationEnd(verificationId);

                  setMissionComplete(true);
                  onCubeEarned();
                  setShowSuccessToast(true);
                  setTimeout(() => setShowSuccessToast(false), 5000);
                  setIsVerifying(false);

                  return true;
                } else {
                  console.log("⏳ Waiting... no count increase yet");
                }
              } else {
                console.log("❌ No interaction found for this dApp");
              }
            }
          }

          // Continuer en arrière-plan
          if (attempt < maxAttempts) {
            const waitTime = attempt <= 4 ? 5000 : 8000; // 5s puis 8s
            console.log(
              `⏳ Background retry in ${
                waitTime / 1000
              }s (${attempt}/${maxAttempts})`
            );
            verificationTimeoutRef.current = setTimeout(
              () => verifyInBackground(attempt + 1, maxAttempts),
              waitTime
            );
          } else {
            console.log("⏰ Background verification timeout");
            localStorage.removeItem("pending_verification");
            localStorage.removeItem("mission_baseline_timestamp");
            verificationTimeoutRef.current = null;
            onVerificationEnd(verificationId);
            setIsVerifying(false);
          }
        } catch (error) {
          console.error("Background verification failed:", error);
          if (attempt < maxAttempts) {
            setTimeout(
              () => verifyInBackground(attempt + 1, maxAttempts),
              5000
            );
          } else {
            localStorage.removeItem("pending_verification");
            localStorage.removeItem("mission_baseline_timestamp");
            setIsVerifying(false);
          }
        }
      };

      // Démarrer la vérification en arrière-plan
      verifyInBackground();
    } catch (error) {
      console.error("Failed to start background verification:", error);
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
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
        >
          ×
        </button>

        <div className="text-center">
          {/* Header */}
          <div className="mb-6">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-2xl font-bold text-white mb-2">Cube Mission</h2>
            <p className="text-gray-300 text-sm">
              Complete this mission to earn a cube!
            </p>
          </div>

          {!missionComplete ? (
            <>
              {/* Mission Description */}
              <div className="bg-white/5 rounded-lg p-4 mb-6">
                <h3 className="text-white font-semibold mb-2">Your Mission:</h3>
                <p className="text-gray-200 text-sm mb-3">
                  Perform a{" "}
                  <span className="text-blue-400 font-semibold uppercase bg-blue-400/20 px-2 py-1 rounded text-xs">
                    {selectedDapp.action || "transaction"}
                  </span>{" "}
                  on{" "}
                  <span className="text-yellow-400 font-semibold">
                    {selectedDapp.name}
                  </span>{" "}
                  to earn your cube!
                </p>
                <p className="text-gray-300 text-xs">
                  Visit the dApp, make a {selectedDapp.action || "transaction"},
                  then return here to verify your mission completion.
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
                      <span>
                        Mission triggered! Complete your interaction and verify
                        below.
                      </span>
                    </div>

                    <button
                      onClick={handleVerifyMission}
                      disabled={!hasTriggered || isVerifying}
                      className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-300 ${
                        !hasTriggered
                          ? "bg-gray-600 cursor-not-allowed opacity-50"
                          : isVerifying
                          ? "bg-yellow-600 cursor-not-allowed opacity-75"
                          : missionComplete
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-blue-600 hover:bg-blue-700 hover:scale-105"
                      }`}
                    >
                      {!hasTriggered ? (
                        "🔒 Visit dApp first"
                      ) : isVerifying ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Verifying in background...
                        </div>
                      ) : missionComplete ? (
                        "✅ Mission Complete!"
                      ) : (
                        "🔍 Verify Mission"
                      )}
                    </button>

                    {isVerifying && (
                      <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <div className="text-blue-400 text-sm text-center">
                          <div className="font-semibold mb-1">
                            ⚡ Background Verification Active
                          </div>
                          <div className="text-xs opacity-80">
                            You can close this modal and continue playing!
                            <br />
                            We'll notify you when the mission is verified.
                          </div>
                        </div>
                      </div>
                    )}
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
        </div>
      </div>

      {/* Success Toast - Notification non-intrusive */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-[10001] bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl border border-green-400/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🎲</div>
            <div>
              <div className="font-bold text-sm">Cube Earned!</div>
              <div className="text-xs opacity-90">
                Mission completed successfully
              </div>
            </div>
            <button
              onClick={() => setShowSuccessToast(false)}
              className="ml-2 text-white/70 hover:text-white text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
