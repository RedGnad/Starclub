// Types pour le système de missions quotidiennes

export interface Mission {
  id: string;
  type: 'dapp_clicks' | 'position_tracking' | 'key_combo';
  title: string;
  description: string;
  target: number; // Objectif à atteindre
  current: number; // Progression actuelle
  completed: boolean;
  reward?: string; // Récompense éventuelle
}

export interface DappClickMission extends Mission {
  type: 'dapp_clicks';
  requiredDapps: string[]; // IDs des dApps à cliquer
  clickedDapps: string[]; // dApps déjà cliquées
}

export interface PositionMission extends Mission {
  type: 'position_tracking';
  requiredPositions: Array<{
    objectName: string;
    position: { x: number; y: number; z: number };
    tolerance: number;
  }>;
  reachedPositions: string[]; // IDs des positions atteintes
}

export interface KeyComboMission extends Mission {
  type: 'key_combo';
  requiredCombos: string[][]; // Combinaisons de touches requises
  completedCombos: string[][]; // Combinaisons déjà réalisées
}

export type AnyMission = DappClickMission | PositionMission | KeyComboMission;

export interface DailyMissionsState {
  currentDate: string; // Format YYYY-MM-DD
  missions: AnyMission[];
  completed: boolean;
  streak: number; // Nombre de jours consécutifs
  lastCompletedDate?: string;
}
