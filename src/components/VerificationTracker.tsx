import React, { useState, useEffect } from "react";

interface VerificationInfo {
  id: string;
  dappName: string;
  startTime: number;
  attempt: number;
  maxAttempts: number;
  completed?: boolean; // Nouvel état pour les missions complétées
}

interface VerificationTrackerProps {
  verifications: VerificationInfo[];
  queue?: any[]; // Missions en attente
  completedVerifications?: string[]; // IDs des vérifications complétées pour animation
}

export function VerificationTracker({
  verifications,
  queue = [],
  completedVerifications = [],
}: VerificationTrackerProps) {
  const [fadingOut, setFadingOut] = useState<Set<string>>(new Set());

  // Gérer l'animation de fade out des missions complétées
  useEffect(() => {
    completedVerifications.forEach((verificationId) => {
      if (!fadingOut.has(verificationId)) {
        // Passer en jaune pendant 2 secondes, puis fade out
        setTimeout(() => {
          setFadingOut(
            (prev) => new Set([...Array.from(prev), verificationId])
          );
        }, 2000);

        // Supprimer complètement après 3 secondes (1s jaune + 2s fade)
        setTimeout(() => {
          setFadingOut((prev) => {
            const newSet = new Set(Array.from(prev));
            newSet.delete(verificationId);
            return newSet;
          });
        }, 4000);
      }
    });
  }, [completedVerifications, fadingOut]);

  // Filtrer les vérifications qui ne sont plus en fade out
  const visibleVerifications = verifications.filter(
    (verif) =>
      !completedVerifications.includes(verif.id) || !fadingOut.has(verif.id)
  );

  if (visibleVerifications.length === 0 && queue.length === 0) return null;

  const totalItems = visibleVerifications.length + queue.length;

  return (
    <div className="fixed top-20 right-4 z-[9997] max-w-xs">
      <div className="bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-3 shadow-xl">
        <div className="text-white text-xs font-bold mb-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
          Missions ({totalItems})
        </div>

        <div className="space-y-2 max-h-40 overflow-y-auto">
          {/* Vérifications en cours */}
          {visibleVerifications.map((verif) => {
            const elapsed = Math.floor((Date.now() - verif.startTime) / 1000);
            const progress = (verif.attempt / verif.maxAttempts) * 100;

            // Détermine l'état visuel
            const isCompleted = completedVerifications.includes(verif.id);
            const isFading = fadingOut.has(verif.id);

            // Couleurs selon l'état
            const borderColor = isCompleted
              ? "border-yellow-400/60"
              : "border-blue-400/30";
            const dotColor = isCompleted ? "bg-yellow-400" : "bg-blue-400";
            const progressColor = isCompleted ? "bg-yellow-400" : "bg-blue-400";
            const opacity = isFading ? "opacity-20" : "opacity-100";

            return (
              <div
                key={verif.id}
                className={`bg-white/5 rounded p-2 border ${borderColor} transition-all duration-1000 ${opacity}`}
              >
                <div className="text-white text-xs font-medium truncate flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
                  {verif.dappName}
                  {isCompleted && (
                    <span className="text-yellow-400 text-xs">✅</span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-white/10 rounded-full h-1">
                    <div
                      className={`${progressColor} h-1 rounded-full transition-all duration-300`}
                      style={{ width: isCompleted ? "100%" : `${progress}%` }}
                    />
                  </div>
                  <div className="text-white/60 text-xs">
                    {isCompleted
                      ? "✅"
                      : `${verif.attempt}/${verif.maxAttempts}`}
                  </div>
                </div>

                <div className="text-white/40 text-xs mt-1">
                  {isCompleted ? "🧊 Cube Earned!" : `${elapsed}s`}
                </div>
              </div>
            );
          })}

          {/* Missions en attente */}
          {queue.map((mission, index) => (
            <div
              key={`queue-${index}`}
              className="bg-white/5 rounded p-2 border border-yellow-400/30"
            >
              <div className="text-white text-xs font-medium truncate flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                {mission.name}
              </div>

              <div className="text-yellow-400/60 text-xs mt-1">
                En attente #{index + 1}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
