import React from "react";
import { useMissions } from "../hooks/useMissions";
import type { AnyMission } from "../types/missions";

interface MissionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onDailyCheckin: () => void;
  onClaimRewards: (cubes: number) => void; // Nouveau prop
}

const DailyCheckinItem: React.FC<{
  mission: AnyMission;
  onCheckin: () => void;
}> = ({ mission, onCheckin }) => {
  const progressPercentage = Math.min(
    (mission.current / mission.target) * 100,
    100
  );

  return (
    <div
      style={{
        backgroundColor: "#0D001D",
        border: `1px solid ${mission.completed ? "#b3f100" : "#ae67c7"}`, // Vert si complété, violet sinon
        borderRadius: "12px",
        padding: "16px",
        margin: "12px 20px",
        transition: "all 0.3s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: "600",
              color: mission.completed ? "#b3f100" : "#ffffff", // Vert si complété
            }}
          >
            {mission.title}
          </h3>
          <span
            style={{
              backgroundColor: mission.completed ? "#b3f100" : "#ae67c7",
              color: "#0D001D",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "bold",
            }}
          >
            {mission.current}/{mission.target}
            {mission.completed && "✓"}
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {!mission.completed && (
            <button
              onClick={onCheckin}
              style={{
                background: "#f19300", // Orange de ta charte
                border: "none",
                borderRadius: "6px",
                color: "#0D001D", // Texte sombre pour contraste
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#ff9f1a"; // Orange plus clair au hover
                e.currentTarget.style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#f19300";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              Check-in
            </button>
          )}
          {mission.completed && (
            <span
              style={{
                color: "#b3f100", // Vert lime
                fontSize: "16px",
              }}
            >
              ✓
            </span>
          )}
        </div>
      </div>
      <p
        style={{
          margin: "0 0 8px 0",
          color: "#ae67c7", // Violet pour la description
          fontSize: "12px",
        }}
      >
        {mission.description}
      </p>
      <div
        style={{
          width: "100%",
          height: "4px",
          backgroundColor: "#1a0033", // Fond de la barre de progression
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progressPercentage}%`,
            height: "100%",
            backgroundColor: mission.completed ? "#b3f100" : "#f19300", // Vert si complété, orange sinon
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
};

const MissionItem: React.FC<{ mission: AnyMission }> = ({ mission }) => {
  const progressPercentage = Math.min(
    (mission.current / mission.target) * 100,
    100
  );

  return (
    <div
      style={{
        backgroundColor: "#0D001D",
        border: `1px solid ${mission.completed ? "#b3f100" : "#ae67c7"}`,
        borderRadius: "12px",
        padding: "16px",
        margin: "12px 20px",
        transition: "all 0.3s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: "600",
              color: mission.completed ? "#b3f100" : "#ffffff",
            }}
          >
            {mission.title}
          </h3>
          <span
            style={{
              backgroundColor: mission.completed ? "#b3f100" : "#ae67c7",
              color: "#0D001D",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "10px",
              fontWeight: "bold",
            }}
          >
            {mission.current}/{mission.target}
            {mission.completed && "✓"}
          </span>
        </div>
        {mission.completed && (
          <span
            style={{
              color: "#b3f100",
              fontSize: "16px",
            }}
          >
            ✓
          </span>
        )}
      </div>
      <p
        style={{
          margin: "0 0 8px 0",
          color: "#ae67c7",
          fontSize: "12px",
        }}
      >
        {mission.description}
      </p>
      <div
        style={{
          width: "100%",
          height: "4px",
          backgroundColor: "#1a0033",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progressPercentage}%`,
            height: "100%",
            backgroundColor: mission.completed ? "#b3f100" : "#f19300",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
};

export const MissionPanel: React.FC<MissionPanelProps> = ({
  isOpen,
  onClose,
  onDailyCheckin,
  onClaimRewards,
}) => {
  const { missions, completed, streak, getAvailableRewards, claimRewards } =
    useMissions();
  const rewards = getAvailableRewards();

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(13, 0, 29, 0.85)", // Plus de transparence pour voir le blur
        backdropFilter: "blur(15px)", // LIQUID GLASS EFFECT
        WebkitBackdropFilter: "blur(15px)", // Support Safari
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        padding: "20px",
      }}
    >
      <div
        style={{
          backgroundColor: "#0D001D",
          border: "2px solid #b3f100",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "480px",
          maxHeight: "90vh",
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(179, 241, 0, 0.2)",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #ae67c7",
            background: "#0D001D",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "18px",
                  fontWeight: "bold",
                  color: "#b3f100",
                }}
              >
                Daily Missions
              </h2>
              <p
                style={{
                  margin: "4px 0 0 0",
                  fontSize: "12px",
                  color: "#ae67c7",
                }}
              >
                Streak: {streak} day{streak > 1 ? "s" : ""} •{" "}
                {missions.filter((m) => m.completed).length}/{missions.length}{" "}
                completed
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "#ae67c7",
                border: "none",
                borderRadius: "8px",
                color: "#0D001D",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#b87fd1";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#ae67c7";
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Global Status */}
        {completed && (
          <div
            style={{
              background: "#0D001D",
              border: "1px solid #b3f100", // Vert lime pour le succès
              borderRadius: "8px",
              padding: "12px",
              margin: "16px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "4px" }}>✓</div>
            <div
              style={{
                color: "#b3f100", // Vert lime pour le texte de succès
                fontWeight: "600",
                fontSize: "14px",
              }}
            >
              All missions completed!
            </div>
            <div
              style={{ color: "#ae67c7", fontSize: "12px", marginTop: "4px" }}
            >
              Come back tomorrow for new missions
            </div>
          </div>
        )}

        {/* Liste des missions */}
        <div>
          {missions.map((mission) => {
            // Utiliser le composant spécial pour Daily Check-in
            if (mission.id.includes("daily_checkin")) {
              return (
                <DailyCheckinItem
                  key={mission.id}
                  mission={mission}
                  onCheckin={onDailyCheckin}
                />
              );
            }
            // Composant normal pour les autres missions
            return <MissionItem key={mission.id} mission={mission} />;
          })}
        </div>

        {/* Claim Rewards Section */}
        {rewards.totalCubes > 0 && (
          <div
            style={{
              margin: "16px 20px",
              padding: "16px",
              backgroundColor: "#0D001D",
              border: "2px solid #b3f100", // Bordure vert lime
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(179, 241, 0, 0.3)", // Ombre verte
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    color: "#b3f100",
                    fontWeight: "bold",
                  }}
                >
                  Rewards Available
                </p>
                <p
                  style={{
                    margin: "4px 0 0 0",
                    fontSize: "12px",
                    color: "#ae67c7",
                  }}
                >
                  {rewards.totalCubes} cube{rewards.totalCubes > 1 ? "s" : ""}{" "}
                  to claim
                </p>
              </div>
              <button
                onClick={() => {
                  const cubesClaimed = claimRewards();
                  if (cubesClaimed > 0) {
                    onClaimRewards(cubesClaimed);
                  }
                }}
                style={{
                  background: "#f19300", // Orange de ta charte
                  border: "2px solid #b3f100", // Bordure vert lime
                  borderRadius: "10px",
                  color: "#0D001D", // Texte sombre
                  padding: "10px 20px",
                  fontSize: "13px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "#ff9f1a"; // Orange plus clair
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 15px rgba(241, 147, 0, 0.4)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "#f19300";
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Claim Rewards
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            margin: "16px 20px 20px 20px",
            paddingTop: "16px",
            borderTop: "1px solid #ae67c7", // Bordure violet
            fontSize: "11px",
            color: "#ae67c7", // Texte violet
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#ffffff",
              marginBottom: "4px",
            }}
          >
            Complete daily missions to earn cubes
          </div>
          <div style={{ fontSize: "10px", color: "#ae67c7" }}>
            Progress resets at midnight UTC
          </div>
        </div>
      </div>
    </div>
  );
};
