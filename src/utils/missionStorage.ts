import type { DailyMissionsState, AnyMission } from '../types/missions';

const STORAGE_KEY = 'sherlock_daily_missions';

// Missions par défaut pour chaque jour
const generateDefaultMissions = (date: string): AnyMission[] => [
  {
    id: `dapp_clicks_${date}`,
    type: 'dapp_clicks',
    title: 'Explorer l\'écosystème',
    description: 'Visiter 4 dApps différentes',
    target: 4,
    current: 0,
    completed: false,
    requiredDapps: [],
    clickedDapps: [],
  },
  {
    id: `key_combo_${date}`,
    type: 'key_combo',
    title: 'Séquence mystère',
    description: 'Déclencher la combinaison secrète',
    target: 1,
    current: 0,
    completed: false,
    requiredCombos: [['x', 'y', 'z']], // Exemple de combo
    completedCombos: [],
  },
  {
    id: `position_${date}`,
    type: 'position_tracking',
    title: 'Exploration spatiale',
    description: 'Atteindre 3 positions spéciales',
    target: 3,
    current: 0,
    completed: false,
    requiredPositions: [
      // Positions à définir plus tard quand les objets seront placés
    ],
    reachedPositions: [],
  },
];

export class MissionStorage {
  private static getTodayDate(): string {
    return new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
  }

  static load(): DailyMissionsState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return this.createNewDay();
      }

      const state: DailyMissionsState = JSON.parse(stored);
      const today = this.getTodayDate();

      // Si c'est un nouveau jour, créer de nouvelles missions
      if (state.currentDate !== today) {
        return this.createNewDay(state);
      }

      return state;
    } catch (error) {
      console.warn('Error loading mission state:', error);
      return this.createNewDay();
    }
  }

  static save(state: DailyMissionsState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Error saving mission state:', error);
    }
  }

  private static createNewDay(previousState?: DailyMissionsState): DailyMissionsState {
    const today = this.getTodayDate();
    let newStreak = 1;

    // Calculer le streak
    if (previousState?.lastCompletedDate) {
      const lastDate = new Date(previousState.lastCompletedDate);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Si l'utilisateur a complété hier, continuer le streak
      if (lastDate.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0]) {
        newStreak = previousState.streak + 1;
      }
    }

    return {
      currentDate: today,
      missions: generateDefaultMissions(today),
      completed: false,
      streak: newStreak,
      lastCompletedDate: previousState?.completed ? previousState.currentDate : undefined,
    };
  }

  static updateMissionProgress(missionId: string, updateFn: (mission: AnyMission) => AnyMission): DailyMissionsState {
    const state = this.load();
    const missionIndex = state.missions.findIndex(m => m.id === missionId);
    
    if (missionIndex === -1) return state;

    const updatedMission = updateFn(state.missions[missionIndex]);
    state.missions[missionIndex] = updatedMission;

    // Vérifier si toutes les missions sont complétées
    state.completed = state.missions.every(m => m.completed);
    if (state.completed && !state.lastCompletedDate) {
      state.lastCompletedDate = state.currentDate;
    }

    this.save(state);
    return state;
  }

  static getMissionProgress(): { completed: number; total: number; allCompleted: boolean } {
    const state = this.load();
    const completed = state.missions.filter(m => m.completed).length;
    const total = state.missions.length;
    return {
      completed,
      total,
      allCompleted: state.completed,
    };
  }
}
