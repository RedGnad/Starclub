import { Router } from 'express';
import { getUserInteractionsService } from '../services/userInteractions.js';

const router = Router();

// GET /api/dapps - Liste des dApps disponibles  
router.get('/', async (req, res) => {
  try {
    const userService = getUserInteractionsService();
    const dapps = await userService.getAvailableDapps();

    res.json({
      success: true,
      data: {
        dapps,
        total: dapps.length,
        usingRealData: userService.isUsingRealData()
      }
    });

  } catch (error) {
    console.error('Error getting dApps:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des dApps'
    });
  }
});

// POST /api/dapps/refresh - Forcer refresh des dApps
router.post('/refresh', async (req, res) => {
  try {
    const userService = getUserInteractionsService();
    userService.refreshDapps();

    res.json({
      success: true,
      message: 'Cache des dApps invalidé'
    });

  } catch (error) {
    console.error('Error refreshing dApps:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du refresh'
    });
  }
});

export { router as dappsRoutes };
