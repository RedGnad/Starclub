import { MissionsAPI } from './missionsAPI';
import { MissionStorage } from '../utils/missionStorage';
import type { DailyMissionsState } from '../types/missions';

// Service hybride qui utilise l'API backend avec fallback localStorage
export class HybridMissionService {
  private static userAddress: string | null = null;
  private static useAPI: boolean = false;

  // Configurer le service avec l'adresse utilisateur
  static configure(address: string | null, authenticated: boolean = false) {
    this.userAddress = address;
    this.useAPI = authenticated && !!address;
    console.log(`🔧 Mission service configured: API=${this.useAPI}, Address=${address}`);
  }

  // Charger les missions (API ou localStorage)
  static async loadMissions(): Promise<DailyMissionsState> {
    if (this.useAPI && this.userAddress) {
      try {
        console.log('🌐 Loading missions from API...');
        const response = await MissionsAPI.getUserMissions(this.userAddress);
        
        if (response.success && response.data) {
          console.log('✅ Missions loaded from API');
          return response.data as unknown as DailyMissionsState;
        }
      } catch (error) {
        console.warn('⚠️ API failed, falling back to localStorage:', error);
      }
    }

    // Fallback vers localStorage
    console.log('💾 Loading missions from localStorage');
    return MissionStorage.load();
  }

  // Sauvegarder les missions (API + localStorage)
  static async saveMissions(state: DailyMissionsState): Promise<void> {
    // Toujours sauvegarder en localStorage pour le fallback
    MissionStorage.save(state);

    // Essayer de synchroniser avec l'API si configuré
    if (this.useAPI && this.userAddress) {
      try {
        console.log('🌐 Syncing missions to API...');
        // TODO: Implémenter la synchro API
        // Pour l'instant on garde juste le localStorage
        console.log('✅ Mission sync completed (localStorage only for now)');
      } catch (error) {
        console.warn('⚠️ API sync failed:', error);
      }
    }
  }

  // Mettre à jour le progrès d'une mission
  static async updateMissionProgress(
    missionId: string, 
    updateFn: (mission: any) => any
  ): Promise<DailyMissionsState> {
    
    if (this.useAPI && this.userAddress) {
      try {
        // TODO: Utiliser l'API pour mettre à jour
        console.log('🌐 Updating mission via API:', missionId);
        
        // Pour l'instant, fallback vers localStorage
        const state = MissionStorage.updateMissionProgress(missionId, updateFn);
        await this.saveMissions(state);
        return state;
        
      } catch (error) {
        console.warn('⚠️ API update failed, using localStorage:', error);
      }
    }

    // Fallback localStorage
    console.log('💾 Updating mission via localStorage:', missionId);
    return MissionStorage.updateMissionProgress(missionId, updateFn);
  }

  // Récupérer le progrès des missions
  static getMissionProgress(): { completed: number; total: number; allCompleted: boolean } {
    return MissionStorage.getMissionProgress();
  }

  // Helper: passer en mode API
  static enableAPIMode(address: string) {
    this.configure(address, true);
  }

  // Helper: passer en mode localStorage uniquement  
  static disableAPIMode() {
    this.configure(null, false);
  }
}
