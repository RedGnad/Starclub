import { useState, useEffect, useCallback } from 'react';
import type { DailyMissionsState, AnyMission, DappClickMission } from '../types/missions';
import { MissionStorage } from '../utils/missionStorage';

export function useMissions() {
  const [missionsState, setMissionsState] = useState<DailyMissionsState>(() => 
    MissionStorage.load()
  );

  // Recharger les missions si nécessaire
  useEffect(() => {
    const state = MissionStorage.load();
    setMissionsState(state);
  }, []);

  // Tracking des clics sur dApps
  const trackDappClick = useCallback((dappName: string, dappId: string) => {
    const updatedState = MissionStorage.updateMissionProgress(
      `dapp_clicks_${missionsState.currentDate}`,
      (mission) => {
        const dappMission = mission as DappClickMission;
        
        // Éviter les doublons
        if (dappMission.clickedDapps.includes(dappId)) {
          return mission;
        }

        const newClickedDapps = [...dappMission.clickedDapps, dappId];
        const newCurrent = newClickedDapps.length;
        
        console.log(`🎯 Mission: dApp "${dappName}" clicked (${newCurrent}/${dappMission.target})`);
        
        return {
          ...dappMission,
          clickedDapps: newClickedDapps,
          current: newCurrent,
          completed: newCurrent >= dappMission.target,
        };
      }
    );
    
    setMissionsState(updatedState);
  }, [missionsState.currentDate]);

  // Tracking des combinaisons de touches
  const trackKeyCombo = useCallback((keys: string[]) => {
    const updatedState = MissionStorage.updateMissionProgress(
      `key_combo_${missionsState.currentDate}`,
      (mission) => {
        if (mission.type !== 'key_combo') return mission;
        
        const keyMission = mission as import('../types/missions').KeyComboMission;
        
        // Vérifier si la combinaison correspond à une des combinaisons requises
        const matchingCombo = keyMission.requiredCombos.find((combo: string[]) => 
          combo.length === keys.length && 
          combo.every((key: string, index: number) => key.toLowerCase() === keys[index]?.toLowerCase())
        );

        if (!matchingCombo) return mission;

        const newCompletedCombos = [...keyMission.completedCombos, keys];
        const newCurrent = newCompletedCombos.length;
        
        console.log(`🎯 Mission: Key combo [${keys.join('-')}] completed (${newCurrent}/${mission.target})`);
        
        return {
          ...keyMission,
          completedCombos: newCompletedCombos,
          current: newCurrent,
          completed: newCurrent >= keyMission.target,
        };
      }
    );
    
    setMissionsState(updatedState);
  }, [missionsState.currentDate]);

  // Tracking des positions (à implémenter plus tard)
  const trackPosition = useCallback((objectName: string, position: { x: number; y: number; z: number }) => {
    // À implémenter quand les objets seront placés dans Spline
    console.log(`🎯 Position tracking: ${objectName} at`, position);
  }, []);

  // Obtenir le statut global des missions
  const getMissionStatus = useCallback(() => {
    return MissionStorage.getMissionProgress();
  }, []);

  return {
    missions: missionsState.missions,
    completed: missionsState.completed,
    streak: missionsState.streak,
    currentDate: missionsState.currentDate,
    
    // Actions
    trackDappClick,
    trackKeyCombo,
    trackPosition,
    getMissionStatus,
    
    // Helpers
    refresh: () => setMissionsState(MissionStorage.load()),
  };
}
