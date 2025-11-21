import { Router } from 'express';
import { prisma } from '../services/database.js';

const router = Router();

const DAILY_CUBE_LIMIT = 25;

// Obtenir le statut des ouvertures de cubes pour un utilisateur
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const today = new Date().toISOString().split('T')[0];

    // Trouver ou créer l'utilisateur
    let user = await prisma.user.findUnique({
      where: { address }
    });

    if (!user) {
      user = await prisma.user.create({
        data: { address }
      });
    }

    // Réinitialiser le compteur si c'est un nouveau jour
    if (user.lastCubeOpenDate !== today) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          cubeOpensToday: 0,
          lastCubeOpenDate: today
        }
      });
    }

    res.json({
      success: true,
      data: {
        cubeOpensToday: user.cubeOpensToday,
        limit: DAILY_CUBE_LIMIT,
        remaining: Math.max(0, DAILY_CUBE_LIMIT - user.cubeOpensToday),
        canOpen: user.cubeOpensToday < DAILY_CUBE_LIMIT
      }
    });

  } catch (error) {
    console.error('Error getting cube limit status:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting cube limit status'
    });
  }
});

// Incrémenter le compteur d'ouvertures de cubes
router.post('/:address/increment', async (req, res) => {
  try {
    const { address } = req.params;
    const today = new Date().toISOString().split('T')[0];

    // Trouver l'utilisateur
    let user = await prisma.user.findUnique({
      where: { address }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Réinitialiser le compteur si c'est un nouveau jour
    if (user.lastCubeOpenDate !== today) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          cubeOpensToday: 0,
          lastCubeOpenDate: today
        }
      });
    }

    // Vérifier la limite
    if (user.cubeOpensToday >= DAILY_CUBE_LIMIT) {
      return res.status(429).json({
        success: false,
        error: 'Daily cube opening limit reached',
        data: {
          cubeOpensToday: user.cubeOpensToday,
          limit: DAILY_CUBE_LIMIT
        }
      });
    }

    // Incrémenter
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        cubeOpensToday: user.cubeOpensToday + 1,
        lastCubeOpenDate: today
      }
    });

    res.json({
      success: true,
      data: {
        cubeOpensToday: user.cubeOpensToday,
        limit: DAILY_CUBE_LIMIT,
        remaining: Math.max(0, DAILY_CUBE_LIMIT - user.cubeOpensToday),
        canOpen: user.cubeOpensToday < DAILY_CUBE_LIMIT
      }
    });

  } catch (error) {
    console.error('Error incrementing cube opens:', error);
    res.status(500).json({
      success: false,
      error: 'Error incrementing cube opens'
    });
  }
});

export const cubeLimitRoutes = router;
