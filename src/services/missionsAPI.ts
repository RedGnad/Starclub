const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'https://starclub-backend.onrender.com';

export interface APIMissionResponse {
  success: boolean;
  data?: {
    currentDate: string;
    missions: any[];
    completed: boolean;
    streak: number;
    lastCompletedDate?: string;
  };
  error?: string;
}

export interface MissionProgressResponse {
  success: boolean;
  data?: {
    mission: any;
    justCompleted?: boolean;
    alreadyCompleted?: boolean;
  };
  error?: string;
}

export interface DailyCheckinResponse {
  success: boolean;
  data?: {
    alreadyCompleted: boolean;
    cubeEarned: boolean;
    newCubeCount?: number;
    message: string;
  };
  error?: string;
}

export interface MissionsResponse {
  success: boolean;
  data?: any[];
  error?: string;
}

export class MissionsAPI {
  private static async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`API Request failed [${endpoint}]:`, error);
      throw error;
    }
  }

  // Récupérer les missions d'un utilisateur
  static async getUserMissions(address: string): Promise<MissionsResponse> {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/api/missions-simple/${address}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting user missions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Mettre à jour le progrès d'une mission
  static async updateMissionProgress(
    address: string, 
    missionId: string, 
    increment: number = 1
  ): Promise<MissionProgressResponse> {
    return this.request(`/api/missions-simple/${address}/progress`, {
      method: 'POST',
      body: JSON.stringify({ missionId, increment }),
    });
  }

  // Helper: marquer une mission comme complétée
  static async completeMission(address: string, missionId: string): Promise<MissionProgressResponse> {
    // Récupérer d'abord la mission pour connaître son target
    const missionsResponse = await this.getUserMissions(address);
    if (!missionsResponse.success || !missionsResponse.data) {
      throw new Error('Failed to get user missions');
    }

    const mission = (missionsResponse.data as any).missions.find((m: any) => m.id === missionId);
    if (!mission) {
      throw new Error('Mission not found');
    }

    // Mettre à jour le progrès pour compléter la mission
    const remainingProgress = mission.target - mission.current;
    if (remainingProgress > 0) {
      return this.updateMissionProgress(address, missionId, remainingProgress);
    }

    return {
      success: true,
      data: {
        mission,
        alreadyCompleted: true
      }
    };
  }

  // Daily Check-in sécurisé - une seule fois par jour
  static async dailyCheckin(address: string): Promise<DailyCheckinResponse> {
    try {
      console.log('📅 Calling secure daily-checkin API for:', address);
      
      const response = await fetch(`${BACKEND_BASE_URL}/api/missions-simple/${address}/daily-checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      console.log('✅ Daily checkin response:', data);
      return data;
      
    } catch (error) {
      console.error('❌ Error in daily checkin:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
