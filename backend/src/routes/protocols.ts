import { Router } from 'express';
import { syncDApps } from '../services/discoveryApi.js';

const router = Router();

// GET /api/protocols - Liste des protocoles depuis Discovery API
router.get('/', async (req, res) => {
  try {
    console.log('🔄 Syncing dApps from GitHub + Google Sheets...');
    
    const dapps = await syncDApps();
    
    res.json({
      success: true,
      data: {
        protocols: dapps,
        total: dapps.length,
        source: 'GitHub + Google Sheets'
      }
    });

  } catch (error) {
    console.error('Error syncing protocols:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la synchronisation des protocoles'
    });
  }
});

// POST /api/protocols/sync - Force sync des protocoles
router.post('/sync', async (req, res) => {
  try {
    console.log('🔄 Force syncing dApps...');
    
    const dapps = await syncDApps();
    
    res.json({
      success: true,
      data: {
        synced: dapps.length,
        message: 'Synchronisation forcée terminée'
      }
    });

  } catch (error) {
    console.error('Error force syncing protocols:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la synchronisation forcée'
    });
  }
});

export { router as protocolsRoutes };
