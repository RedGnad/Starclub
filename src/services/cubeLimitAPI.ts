const API_BASE_URL = (import.meta as any).env.VITE_BACKEND_URL || 'https://starclub-backend.onrender.com';

export interface CubeLimitStatus {
  cubeOpensToday: number;
  limit: number;
  remaining: number;
  canOpen: boolean;
}

export interface CubeLimitResponse {
  success: boolean;
  data?: CubeLimitStatus;
  error?: string;
}

export class CubeLimitAPI {
  // Obtenir le statut des limites pour un utilisateur
  static async getLimitStatus(address: string): Promise<CubeLimitResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cube-limit/${address}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting cube limit status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Incrémenter le compteur d'ouvertures
  static async incrementOpens(address: string): Promise<CubeLimitResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/cube-limit/${address}/increment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error incrementing cube opens:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
