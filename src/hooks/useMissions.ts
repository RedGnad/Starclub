import React, { useState, useEffect, useCallback } from 'react';
import type { DailyMissionsState, AnyMission, DappClickMission } from '../types/missions';
import { MissionStorage } from '../utils/missionStorage';

export function useMissions() {
  // État des missions quotidiennes  
  const [missionsState, setMissionsState] = useState(() => MissionStorage.load());
  
  // Listener pour synchroniser avec localStorage (pour forcer les updates)
  React.useEffect(() => {
    const handleStorageChange = () => {
      console.log("📦 Storage change detected, refreshing missions state");
      setMissionsState(MissionStorage.load());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
    console.log(`⌨️ Key combo detected:`, keys);
    
    // Traitement spécial pour cube_modal_opened
    if (keys.includes('cube_modal_opened')) {
      console.log("🎯 Marking Cube Activator progress");
      
      const updatedState = MissionStorage.updateMissionProgress(
        `cube_activations_${missionsState.currentDate}`,
        (mission) => {
          const newCurrent = Math.min(mission.current + 1, mission.target);
          
          console.log(`🎯 Cube Activator: ${newCurrent}/${mission.target}`);
          
          return {
            ...mission,
            current: newCurrent,
            completed: newCurrent >= mission.target,
            // Assigner completedCombos uniquement si c'est une mission key_combo
            ...(mission.type === 'key_combo' ? {
              completedCombos: newCurrent >= mission.target ? [['cube_modal_opened']] : (mission as any).completedCombos || [],
            } : {}),
          };
        }
      );
      
      setMissionsState(updatedState);
      
      // Vérifier si la mission vient d'être complétée
      const mission = updatedState.missions.find(m => m.id === `cube_activations_${missionsState.currentDate}`);
      if (mission && mission.completed && mission.current === mission.target) {
        console.log("🎯 Cube Activator completed! Awarding 1 cube");
        // TODO: gérer l'attribution du cube dans App.tsx
      }
      return;
    }
    
    const updatedState = MissionStorage.updateMissionProgress(
      `key_combos_${missionsState.currentDate}`,
      (mission) => {
        if (mission.type !== 'key_combo') return mission;
        
        const keyMission = mission as any;
        const requiredCombo = keyMission.requiredCombos[0]; // Premier combo requis
        
        // Vérifier si les touches correspondent
        const keysMatch = requiredCombo.every((key: string) => keys.includes(key));
        if (!keysMatch) return mission;
        
        const newCompletedCombos = [...(keyMission.completedCombos || []), keys];
        const newCurrent = Math.min(newCompletedCombos.length, keyMission.target);
        
        console.log(`⌨️ Key combo progress: ${newCurrent}/${keyMission.target}`);
        
        return {
          ...mission,
          completedCombos: newCompletedCombos,
          current: newCurrent,
          completed: newCurrent >= keyMission.target,
        };
      }
    );
    
    setMissionsState(updatedState);
  }, [missionsState.currentDate]);

  // Tracking des positions - Event Sphere Verif
  const trackPosition = useCallback((objectName: string, position: { x: number; y: number; z: number }) => {
    console.log(`🎯 Position tracking: ${objectName} at`, position);
    
    // Détection de l'événement Sphere Verif
    if (objectName.toLowerCase().includes('sphere') && objectName.toLowerCase().includes('verif')) {
      if (position.y <= -2900 && position.y >= -3100) {
        console.log('🎯 MISSION EVENT DETECTED: Sphere Verif at y=-3000!');
        // Trigger mission event
        return true;
      }
    }
    
    return false;
  }, []);

  // Nouveau: déclenchement de mission cube
  const [missionTriggered, setMissionTriggered] = useState(false);
  const [activeMission, setActiveMission] = useState<any>(null);

  const triggerCubeMission = useCallback((superDapps: any[]) => {
    console.log('🔍 DEBUG triggerCubeMission called with:', superDapps);
    if (superDapps.length === 0) {
      console.log('🔍 DEBUG: superDapps.length === 0, returning early');
      return;
    }
    
    // Choisir une SuperDApp au hasard
    const randomDapp = superDapps[Math.floor(Math.random() * superDapps.length)];
    console.log('🔍 DEBUG: randomDapp selected:', randomDapp);
    
    console.log('🎯 CUBE MISSION TRIGGERED:', randomDapp.name);
    
    // NOUVEAU: Tracker l'ouverture du modal cube pour la mission "Cube Activator"
    console.log('📊 Tracking cube modal opened for mission progress...');
    trackKeyCombo(['cube_modal_opened']);
    
    setActiveMission(randomDapp);
    setMissionTriggered(true);
    console.log('🔍 DEBUG: triggerCubeMission completed successfully');
  }, [trackKeyCombo]);

  const resetMission = useCallback(() => {
    setMissionTriggered(false);
    setActiveMission(null);
  }, []);

  // Daily Check-in completion - NOUVEAU: donne 1 cube immédiatement
  const completeDailyCheckin = useCallback(() => {
    console.log("📅 Completing daily check-in...");
    
    const updatedState = MissionStorage.updateMissionProgress(
      `daily_checkin_${missionsState.currentDate}`,
      (mission) => {
        if (mission.completed) {
          console.log("⚠️ Daily check-in already completed today");
          return mission;
        }
        
        console.log("✅ Daily check-in completed!");
        return {
          ...mission,
          current: 1,
          completed: true,
        };
      }
    );
    
    setMissionsState(updatedState);
    
    // NOUVEAU: donner 1 cube pour cette mission
    console.log("🎯 Daily check-in completed! Awarding 1 cube");
    return { giveCube: true, reason: 'daily_checkin' };
  }, [missionsState.currentDate]);

  // Marquer une mission cube comme complétée - NOUVEAU: donne 1 cube immédiatement
  const markCubeCompleted = useCallback(() => {
    console.log("🎯 Marking cube mission as completed");
    
    const updatedState = MissionStorage.updateMissionProgress(
      `cube_completions_${missionsState.currentDate}`,
      (mission) => {
        if (mission.completed) {
          console.log("⚠️ Cube mission already completed today");
          return mission;
        }
        
        console.log("✅ Cube mission completed!");
        return {
          ...mission,
          current: 1,
          completed: true,
          completedCombos: [['cube_completed']],
        };
      }
    );
    
    setMissionsState(updatedState);
    
    // NOUVEAU: donner 1 cube pour cette mission
    console.log("🎯 Cube Master completed! Awarding 1 cube");
    return { giveCube: true, reason: 'cube_master' };
  }, [missionsState.currentDate]);

  // Calculer les récompenses disponibles
  const getAvailableRewards = useCallback(() => {
    const completedMissions = missionsState.missions.filter(m => m.completed);
    const totalRewards = completedMissions.length; // 1 cube par mission complétée
    
    // Vérifier si les récompenses ont déjà été récupérées aujourd'hui
    const claimedKey = `rewards_claimed_${missionsState.currentDate}`;
    const alreadyClaimed = localStorage.getItem(claimedKey) === 'true';
    
    return {
      totalCubes: alreadyClaimed ? 0 : totalRewards,
      alreadyClaimed,
      completedMissions: completedMissions.length,
      totalMissions: missionsState.missions.length
    };
  }, [missionsState]);
  
  // Récupérer les récompenses manuellement
  const claimRewards = useCallback(() => {
    const rewards = getAvailableRewards();
    if (rewards.totalCubes > 0) {
      // Marquer comme récupéré
      const claimedKey = `rewards_claimed_${missionsState.currentDate}`;
      localStorage.setItem(claimedKey, 'true');
      
      console.log(`🎁 Claiming ${rewards.totalCubes} cubes from daily missions!`);
      return rewards.totalCubes;
    }
    return 0;
  }, [missionsState.currentDate, getAvailableRewards]);
  const checkAllMissionsCompleted = useCallback(() => {
    const state = MissionStorage.load();
    const allCompleted = state.missions.every(m => m.completed);
    if (allCompleted && !state.completed) {
      console.log("🎯 TOUTES LES MISSIONS QUOTIDIENNES COMPLÉTÉES ! Cube mérité !");
      // Marquer comme complété dans le storage
      const updatedState = {...state, completed: true, lastCompletedDate: state.currentDate};
      MissionStorage.save(updatedState);
      setMissionsState(updatedState);
      return true;
    }
    return false;
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
    completeDailyCheckin,
    markCubeCompleted,
    checkAllMissionsCompleted,
    getMissionStatus,
    getAvailableRewards,
    claimRewards,
    
    // Cube Mission
    missionTriggered,
    activeMission,
    triggerCubeMission,
    resetMission,
    
    // Helpers
    refresh: () => setMissionsState(MissionStorage.load()),
  };
}
