import React from "react";

interface VerificationInfo {
  id: string;
  dappName: string;
  startTime: number;
  attempt: number;
  maxAttempts: number;
}

interface VerificationTrackerProps {
  verifications: VerificationInfo[];
  queue?: any[]; // Missions en attente
}

export function VerificationTracker({
  verifications,
  queue = [],
}: VerificationTrackerProps) {
  if (verifications.length === 0 && queue.length === 0) return null;

  const totalItems = verifications.length + queue.length;

  return (
    <div className="fixed top-20 right-4 z-[9997] max-w-xs">
      <div className="bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg p-3 shadow-xl">
        <div className="text-white text-xs font-bold mb-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          Missions ({totalItems})
        </div>

        <div className="space-y-2 max-h-40 overflow-y-auto">
          {/* Vérifications en cours */}
          {verifications.map((verif) => {
            const elapsed = Math.floor((Date.now() - verif.startTime) / 1000);
            const progress = (verif.attempt / verif.maxAttempts) * 100;

            return (
              <div
                key={verif.id}
                className="bg-white/5 rounded p-2 border border-blue-400/30"
              >
                <div className="text-white text-xs font-medium truncate flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  {verif.dappName}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-white/10 rounded-full h-1">
                    <div
                      className="bg-blue-400 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-white/60 text-xs">
                    {verif.attempt}/{verif.maxAttempts}
                  </div>
                </div>

                <div className="text-white/40 text-xs mt-1">{elapsed}s</div>
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
