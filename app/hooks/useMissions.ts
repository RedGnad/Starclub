// Hook pour gérer les missions
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import type { AnyMission, MissionProgress } from '../types/missions';

// Missions mock pour le développement
const MOCK_MISSIONS: AnyMission[] = [
  {
    id: 'atlantis-swap',
    title: 'First Swap on Atlantis',
    description: 'Complete your first token swap on Atlantis DEX',
    dappId: 'atlantis',
    dappName: 'Atlantis',
    category: 'DeFi',
    difficulty: 'Easy',
    points: 100,
    status: 'available',
    type: 'interaction',
    requirements: {
      contractAddress: '0x3012E9049d05B4B5369D690114D5A5861EbB85cb',
      minTransactions: 1,
      description: 'Make a swap transaction on Atlantis'
    }
  },
  {
    id: 'kuru-trade',
    title: 'Trade on Kuru CLOB',
    description: 'Execute a trade on Kuru\'s on-chain order book',
    dappId: 'kuru',
    dappName: 'Kuru',
    category: 'DeFi',
    difficulty: 'Medium',
    points: 200,
    status: 'available',
    type: 'interaction',
    requirements: {
      contractAddress: '0xc816865f172d640d93712C68a7E1F83F3fA63235',
      minTransactions: 1,
      description: 'Complete a trade on Kuru exchange'
    }
  },
  {
    id: 'dapp-explorer',
    title: 'Monad Explorer',
    description: 'Discover 5 different dApps on Monad testnet',
    dappId: 'general',
    dappName: 'Discovery',
    category: 'Exploration',
    difficulty: 'Easy',
    points: 50,
    status: 'available',
    type: 'exploration',
    requirements: {
      discoveryCount: 5,
      categories: ['DeFi', 'NFT', 'Gaming']
    }
  }
];

export function useMissions() {
  const { address, isConnected } = useAccount();
  const [missions, setMissions] = useState<AnyMission[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<Record<string, MissionProgress>>({});

  // Charger les missions
  useEffect(() => {
    if (!isConnected || !address) {
      setMissions([]);
      return;
    }

    setLoading(true);
    
    // Simuler un chargement
    setTimeout(() => {
      setMissions(MOCK_MISSIONS);
      setLoading(false);
    }, 500);
  }, [isConnected, address]);

  // Charger les progrès depuis localStorage
  useEffect(() => {
    if (!address) return;

    const savedProgress = localStorage.getItem(`missions_progress_${address}`);
    if (savedProgress) {
      try {
        setProgress(JSON.parse(savedProgress));
      } catch (error) {
        console.warn('Erreur chargement progrès missions:', error);
      }
    }
  }, [address]);

  // Sauvegarder les progrès
  const saveProgress = (newProgress: Record<string, MissionProgress>) => {
    if (!address) return;
    
    setProgress(newProgress);
    localStorage.setItem(`missions_progress_${address}`, JSON.stringify(newProgress));
  };

  // Marquer une mission comme complétée
  const completeMission = (missionId: string) => {
    const newProgress = {
      ...progress,
      [missionId]: {
        missionId,
        completed: true,
        progress: 100,
        startedAt: progress[missionId]?.startedAt || new Date(),
        completedAt: new Date()
      }
    };
    
    saveProgress(newProgress);
    
    // Mettre à jour le statut de la mission
    setMissions(prev => prev.map(mission => 
      mission.id === missionId 
        ? { ...mission, status: 'completed' as const, completedAt: new Date() }
        : mission
    ));
  };

  // Démarrer une mission
  const startMission = (missionId: string) => {
    const newProgress = {
      ...progress,
      [missionId]: {
        missionId,
        completed: false,
        progress: 0,
        startedAt: new Date()
      }
    };
    
    saveProgress(newProgress);
    
    setMissions(prev => prev.map(mission => 
      mission.id === missionId 
        ? { ...mission, status: 'in_progress' as const }
        : mission
    ));
  };

  // Calculer les statistiques
  const completed = missions.filter((m: any) => m.status === 'completed').length;
  const streak = 0; // À implémenter
  
  const getMissionStatus = () => ({
    total: missions.length,
    completed,
    inProgress: missions.filter((m: any) => m.status === 'in_progress').length,
    available: missions.filter((m: any) => m.status === 'available').length
  });

  return {
    missions,
    loading,
    progress,
    completed,
    streak,
    getMissionStatus,
    completeMission,
    startMission
  };
}
