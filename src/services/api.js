// Service API pour communiquer avec le backend Starclub
// Frontend → Backend (localhost:3000 → localhost:4000)

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:4000';

class StarclubAPI {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper pour les requêtes HTTP
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      console.log(`🌐 API Request: ${config.method || 'GET'} ${url}`);
      
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ API Response:`, data);
      
      return data;
    } catch (error) {
      console.error(`❌ API Error for ${endpoint}:`, error);
      throw error;
    }
  }

  // ============ AUTH ENDPOINTS ============
  
  /**
   * Générer un nonce pour SIWE
   */
  async generateNonce() {
    return this.request('/api/auth/nonce', {
      method: 'POST'
    });
  }

  /**
   * Vérifier une signature SIWE
   */
  async verifySignature(message, signature, address) {
    return this.request('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({
        message,
        signature,
        address
      })
    });
  }

  // ============ USER ENDPOINTS ============
  
  /**
   * Vérifier l'activité d'un wallet (BlockVision)
   */
  async verifyWallet(address) {
    return this.request(`/api/user/${address}/verify`);
  }

  /**
   * Vérifier les interactions d'un wallet avec les dApps
   */
  async checkUserInteractions(address, dappId = null) {
    const params = dappId ? `?dappId=${dappId}` : '';
    return this.request(`/api/user/${address}/interactions${params}`);
  }

  // ============ DAPPS ENDPOINTS ============
  
  /**
   * Récupérer la liste des SuperDApps
   */
  async getSuperDApps() {
    return this.request('/api/dapps');
  }

  /**
   * Forcer le refresh du cache des dApps
   */
  async refreshDApps() {
    return this.request('/api/dapps/refresh', {
      method: 'POST'
    });
  }

  // ============ PROTOCOLS ENDPOINTS ============
  
  /**
   * Récupérer tous les protocoles (GitHub + Google Sheets)
   */
  async getProtocols() {
    return this.request('/api/protocols');
  }

  /**
   * Forcer la synchronisation des protocoles
   */
  async syncProtocols() {
    return this.request('/api/protocols/sync', {
      method: 'POST'
    });
  }

  // ============ CONTRACTS ENDPOINTS ============
  
  /**
   * Tester la connexion BlockVision
   */
  async testBlockVision() {
    return this.request('/api/contracts/test');
  }

  // ============ HEALTH ENDPOINTS ============
  
  /**
   * Test de santé du backend
   */
  async healthCheck() {
    return this.request('/api/test');
  }

  /**
   * Vérifier le statut complet du backend
   */
  async getStatus() {
    return this.request('/');
  }
}

// Export singleton
export const starclubAPI = new StarclubAPI();
export default starclubAPI;
