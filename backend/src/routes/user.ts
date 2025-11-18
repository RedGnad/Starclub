import { Router } from 'express';
import { getUserInteractionsService } from '../services/userInteractions.js';
import { getBlockVisionService } from '../services/blockVisionApi.js';

const router = Router();

// GET /api/user/:address/interactions - Vérifier interactions utilisateur
router.get('/:address/interactions', async (req, res) => {
  try {
    const { address } = req.params;
    const { dappId } = req.query;

    const userService = getUserInteractionsService();
    const result = await userService.checkUserInteractionWith24h(
      address,
      dappId as string
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error checking user interactions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification des interactions'
    });
  }
});

// GET /api/user/:address/verify - Vérifier activité utilisateur
router.get('/:address/verify', async (req, res) => {
  try {
    const { address } = req.params;

    const blockVision = getBlockVisionService();
    const result = await blockVision.checkUserInteractionsLast24h(address, []);

    res.json({
      success: true,
      data: {
        address,
        hasActivity: result.hasActivity,
        lastActivity: result.lastActivityDate,
        transactionCount: result.transactionCount,
        verified: result.hasActivity
      }
    });

  } catch (error) {
    console.error('Error verifying user:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification utilisateur'
    });
  }
});

export { router as userRoutes };
