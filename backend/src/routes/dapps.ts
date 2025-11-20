import { Router } from 'express';
import { getUserInteractionsService } from '../services/userInteractions.js';

const router = Router();

// GET /api/dapps - Liste des dApps disponibles  
router.get('/', async (req, res) => {
  try {
    const started = Date.now();
    console.log(`[API] GET /api/dapps start`, { ts: new Date().toISOString() });
    const userService = getUserInteractionsService();
    const dapps = await userService.getAvailableDapps();

    const durationMs = Date.now() - started;
    console.log(`[API] GET /api/dapps success`, { count: dapps.length, durationMs });
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
    const started = Date.now();
    console.log(`[API] POST /api/dapps/refresh start`, { ts: new Date().toISOString() });
    const userService = getUserInteractionsService();
    userService.refreshDapps();

    const durationMs = Date.now() - started;
    console.log(`[API] POST /api/dapps/refresh success`, { durationMs });
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
