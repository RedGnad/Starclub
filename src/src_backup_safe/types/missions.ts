// Types pour le système de missions

export interface BaseMission {
  id: string;
  title: string;
  description: string;
  dappId: string;
  dappName: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  status: 'available' | 'in_progress' | 'completed' | 'locked';
  completedAt?: Date;
  progress?: number; // 0-100%
}

export interface InteractionMission extends BaseMission {
  type: 'interaction';
  requirements: {
    contractAddress: string;
    minTransactions?: number;
    description: string;
  };
}

export interface QuestMission extends BaseMission {
  type: 'quest';
  steps: Array<{
    id: string;
    description: string;
    completed: boolean;
  }>;
}

export interface ExplorationMission extends BaseMission {
  type: 'exploration';
  requirements: {
    discoveryCount: number;
    categories?: string[];
  };
}

export type AnyMission = InteractionMission | QuestMission | ExplorationMission;

export interface MissionReward {
  type: 'points' | 'badge' | 'nft' | 'token';
  value: number | string;
  description: string;
}

export interface MissionProgress {
  missionId: string;
  completed: boolean;
  progress: number;
  startedAt: Date;
  completedAt?: Date;
}
