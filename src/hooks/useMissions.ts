import React, { useState, useEffect, useCallback } from 'react';
import type { DailyMissionsState, AnyMission } from '../types/missions';
import { MissionsAPI, type DailyCheckinResponse } from '../services/missionsAPI';

export function useMissions(userAddress?: string) {
  console.log('🔍 DEBUG useMissions called with userAddress:', userAddress);
  
  // État des missions quotidiennes  
  const [missionsState, setMissionsState] = useState<DailyMissionsState>({
    currentDate: new Date().toISOString().split('T')[0],
    missions: [],
    completed: false,
    streak: 1,
    lastCompletedDate: undefined,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Charger les missions depuis l'API
  const loadMissions = useCallback(async () => {
    if (!userAddress) {
      console.log('⚠️ No user address, skipping mission load');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('🌐 Loading missions from API for:', userAddress);
      const response = await MissionsAPI.getUserMissions(userAddress);
      
      if (response.success && response.data) {
        console.log('✅ Missions loaded from API:', response.data);
      if (response.data.missions) {
        console.log('🔍 DEBUG missions array:', response.data.missions);
        console.log('🔍 DEBUG first mission:', response.data.missions[0]);
      }
        setMissionsState(response.data as unknown as DailyMissionsState);
      } else {
        throw new Error(response.error || 'Failed to load missions');
      }
    } catch (err) {
      console.error('❌ Failed to load missions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  // Charger les missions au montage et quand l'adresse change
  useEffect(() => {
    loadMissions();
  }, [loadMissions]);

  // Mettre à jour le progrès d'une mission
  const updateMissionProgress = useCallback(async (missionId: string, increment: number = 1) => {
    if (!userAddress) {
      console.error('❌ Cannot update mission without user address');
      return null;
    }

    try {
      console.log('🌐 Updating mission progress:', { missionId, increment });
      const response = await MissionsAPI.updateMissionProgress(userAddress, missionId, increment);
      
      if (response.success) {
        console.log('✅ Mission progress updated');
        // Recharger les missions pour avoir l'état à jour
        await loadMissions();
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to update mission progress');
      }
    } catch (err) {
      console.error('❌ Failed to update mission progress:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [userAddress, loadMissions]);

  // Fonctions simplifiées pour compatibilité
  const trackDappClick = useCallback(async (dappName: string, dappId: string) => {
    console.log(`📱 DApp clicked: ${dappName} (${dappId})`);
    // TODO: Implémenter si nécessaire côté API
  }, []);

  // Tracking des combinaisons de touches
  const trackKeyCombo = useCallback((keys: string[]) => {
    console.log(`⌨️ Key combo detected:`, keys);
    console.log(`🔍 DEBUG: userAddress in trackKeyCombo:`, userAddress);
    console.log(`🔍 DEBUG: userAddress type:`, typeof userAddress);
    console.log(`🔍 DEBUG: userAddress === undefined:`, userAddress === undefined);
    console.log(`🔍 DEBUG: userAddress === null:`, userAddress === null);
    console.log(`🔍 DEBUG: userAddress length:`, userAddress?.length);
    
    if (!userAddress) {
      console.error('❌ Cannot track key combo without user address');
      console.error('❌ FULL DEBUG userAddress:', JSON.stringify(userAddress));
      return null;
    }
    
    // Traitement spécial pour discovery_modal_opened
    if (keys.includes('discovery_modal_opened')) {
      console.log("🎯 Marking Discovery Arcade progress");
      
      const result = updateMissionProgress(`discovery_arcade_${missionsState.currentDate}`, 1);
      return result;
    }
    
    // Traitement spécial pour cube_modal_opened
    if (keys.includes('cube_modal_opened')) {
      console.log("🎯 Marking Cube Activator progress");
      
      const result = updateMissionProgress(`cube_activations_${missionsState.currentDate}`, 1);
      return result;
    }
    
    console.log(`⌨️ Key combo progress: ${keys}`);
    
    return null;
  }, [userAddress, missionsState.currentDate, updateMissionProgress]);

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

  const triggerCubeMission = useCallback((superDapps: any[], passedAddress?: string) => {
    console.log('🔍 DEBUG triggerCubeMission called with:', superDapps);
    
    // Utiliser passedAddress OU userAddress
    const effectiveAddress = passedAddress || userAddress;
    console.log('🔍 DEBUG: effectiveAddress:', effectiveAddress);
    
    if (superDapps.length === 0) {
      console.log('🔍 DEBUG: superDapps.length === 0, returning early');
      return;
    }
    
    // Choisir une SuperDApp au hasard
    const randomDapp = superDapps[Math.floor(Math.random() * superDapps.length)];
    console.log('🔍 DEBUG: randomDapp selected:', randomDapp);
    
    console.log('🎯 CUBE MISSION TRIGGERED:', randomDapp.name);
    
    // Mettre à jour mission "Cube Activator" SI on a une adresse
    if (effectiveAddress) {
      console.log('✅ Updating Cube Activator mission for:', effectiveAddress);
      const today = new Date().toISOString().split('T')[0];
      updateMissionProgress(`cube_activations_${today}`, 1);
    } else {
      console.log('⚠️ No address available, skipping cube mission progress');
    }
    
    setActiveMission(randomDapp);
    setMissionTriggered(true);
  }, [userAddress, updateMissionProgress]);

  const resetMission = useCallback(() => {
    setMissionTriggered(false);
    setActiveMission(null);
  }, []);

  // Daily Check-in sécurisé - nouvelle version
  const completeDailyCheckin = useCallback(async (): Promise<{ giveCube: boolean; reason: string }> => {
    console.log("📅 Starting secure daily check-in...");
    
    if (!userAddress) {
      console.error('❌ Cannot complete daily check-in without user address');
      return { giveCube: false, reason: 'no_address' };
    }
    
    try {
      const response = await MissionsAPI.dailyCheckin(userAddress);
      
      if (response.success && response.data) {
        console.log('✅ Daily checkin result:', response.data);
        
        // Recharger les missions après le daily check-in
        await loadMissions();
        
        return { 
          giveCube: response.data.cubeEarned, 
          reason: response.data.alreadyCompleted ? 'already_completed' : 'daily_checkin_success' 
        };
      } else {
        console.error('❌ Daily checkin failed:', response.error);
        return { giveCube: false, reason: response.error || 'api_failed' };
      }
    } catch (error) {
      console.error('❌ Daily checkin error:', error);
      return { giveCube: false, reason: 'exception' };
    }
  }, [userAddress, loadMissions]);

  // Marquer une mission cube comme complétée
  const markCubeCompleted = useCallback(async () => {
    console.log("🎯 Marking cube mission as completed");
    
    if (!userAddress) {
      console.error('❌ Cannot mark cube completed without user address');
      return { giveCube: false, reason: 'no_address' };
    }
    
    const today = missionsState.currentDate;
    const result = await updateMissionProgress(`cube_completions_${today}`, 1);
    
    if (result?.justCompleted) {
      console.log("🎯 Cube Master completed! Awarding 1 cube");
      return { giveCube: true, reason: 'cube_master' };
    }
    
    return { giveCube: false, reason: 'already_completed' };
  }, [userAddress, missionsState.currentDate, updateMissionProgress]);

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
    const allCompleted = missionsState.missions.every((m: AnyMission) => m.completed);
    if (allCompleted && !missionsState.completed) {
      console.log("🎯 TOUTES LES MISSIONS QUOTIDIENNES COMPLÉTÉES ! Cube mérité !");
      return true;
    }
    return false;
  }, [missionsState]);

  // Obtenir le statut global des missions
  const getMissionStatus = useCallback(() => {
    const completed = missionsState.missions.filter(m => m.completed).length;
    const total = missionsState.missions.length;
    return {
      completed,
      total,
      allCompleted: missionsState.completed,
    };
  }, [missionsState]);

  return {
    // État
    missions: missionsState.missions,
    completed: missionsState.completed,
    streak: missionsState.streak,
    currentDate: missionsState.currentDate,
    loading,
    error,
    
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
    refresh: loadMissions,
  };
}
