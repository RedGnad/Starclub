import React from 'react';
import { useMissions } from '../hooks/useMissions';
import type { AnyMission } from '../types/missions';

interface MissionPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MissionItem: React.FC<{ mission: AnyMission }> = ({ mission }) => {
  const progressPercentage = mission.status === 'completed' ? 100 : mission.progress || 0;
  
  return (
    <div style={{
      padding: '12px',
      background: mission.status === 'completed'
        ? 'rgba(34, 197, 94, 0.1)' 
        : 'rgba(255, 255, 255, 0.05)',
      border: `1px solid ${mission.status === 'completed' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
      borderRadius: '8px',
      marginBottom: '8px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px',
      }}>
        <h4 style={{
          margin: '0 0 4px 0',
          fontSize: '14px',
          fontWeight: '600',
          color: mission.status === 'completed' ? '#22c55e' : '#ffffff',
        }}>
          {mission.status === 'completed' ? '✅' : '⏳'} {mission.title}
        </h4>
        <span style={{
          fontSize: '12px',
          color: '#888',
          fontWeight: '500',
        }}>
          {mission.points} pts - {mission.difficulty}
        </span>
      </div>
      
      <p style={{
        margin: '0 0 8px 0',
        fontSize: '12px',
        color: '#ccc',
        lineHeight: 1.4,
      }}>
        {mission.description}
      </p>
      
      {/* Barre de progression */}
      <div style={{
        width: '100%',
        height: '4px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '2px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${progressPercentage}%`,
          height: '100%',
          background: mission.status === 'completed'
            ? 'linear-gradient(90deg, #22c55e, #16a34a)' 
            : 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
};

export const MissionPanel: React.FC<MissionPanelProps> = ({ isOpen, onClose }) => {
  const { missions, completed, streak, getMissionStatus } = useMissions();
  const status = getMissionStatus();

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
      zIndex: 2000,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95), rgba(20, 20, 20, 0.95))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '24px',
        width: '400px',
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
              🎯 Missions Quotidiennes
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              fontSize: '12px',
              color: '#888',
            }}>
              Streak: {streak} jour{streak > 1 ? 's' : ''} • {status.completed}/{status.total} complétées
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

        {/* Statut global */}
        {completed && (
          <div style={{
            background: 'linear-gradient(90deg, rgba(34, 197, 94, 0.1), rgba(16, 185, 129, 0.1))',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🎉</div>
            <div style={{ color: '#22c55e', fontWeight: '600', fontSize: '14px' }}>
              Toutes les missions complétées !
            </div>
            <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
              Revenez demain pour de nouvelles missions
            </div>
          </div>
        )}

        {/* Liste des missions */}
        <div>
          {missions.map(mission => (
            <MissionItem key={mission.id} mission={mission} />
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '11px',
          color: '#666',
          textAlign: 'center',
        }}>
          Les missions se renouvellent chaque jour à minuit
        </div>
      </div>
    </div>
  );
};
