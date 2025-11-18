import { Router } from 'express';
import { getBlockVisionService } from '../services/blockVisionApi.js';

const router = Router();

// GET /api/contracts/test - Test connexion BlockVision
router.get('/test', async (req, res) => {
  try {
    const blockVision = getBlockVisionService();
    const isConnected = await blockVision.testConnection();

    res.json({
      success: true,
      data: {
        connected: isConnected,
        rateLimits: blockVision.getRateLimitInfo()
      }
    });

  } catch (error) {
    console.error('Error testing BlockVision connection:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du test de connexion'
    });
  }
});

export { router as contractsRoutes };
