import { Router } from 'express';
import { prisma, getOrCreateUser } from '../services/database.js';

const router = Router();

// Types pour les missions
interface MissionTemplate {
  id: string;
  type: string;
  title: string;
  description: string;
  target: number;
}

// Templates des missions quotidiennes
const getMissionTemplates = (date: string): MissionTemplate[] => [
  {
    id: `daily_checkin_${date}`,
    type: 'daily_checkin',
    title: 'Daily Check-in',
    description: 'Connect and open the application',
    target: 1,
  },
  {
    id: `discovery_arcade_${date}`,
    type: 'discovery_arcade',
    title: 'Turn on Discovery Arcade',
    description: 'Open the Discovery Arcade modal',
    target: 1,
  },
  {
    id: `cube_activations_${date}`,
    type: 'cube_activator',
    title: 'Cube Activator',
    description: 'Open 3 cube mission modals',
    target: 3,
  },
  {
    id: `cube_completions_${date}`,
    type: 'cube_master',
    title: 'Cube Master',
    description: 'Complete 1 cube mission (earn 1 cube)',
    target: 1,
  },
];

// GET /api/missions/:address - Récupérer les missions d'un utilisateur pour aujourd'hui
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Address required'
      });
    }

    const user = await getOrCreateUser(address);
    const templates = getMissionTemplates(today);

    // Récupérer les missions existantes pour aujourd'hui
    const existingMissions = await prisma.dailyMission.findMany({
      where: {
        userId: user.id,
        date: today
      }
    });

    // Créer les missions manquantes
    const missingMissions = templates.filter(
      template => !existingMissions.find((m: any) => m.missionId === template.id)
    );

    if (missingMissions.length > 0) {
      // Créer chaque mission avec ID manuel
      for (const template of missingMissions) {
        const missionId = `mission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await prisma.dailyMission.create({
          data: {
            id: missionId,
            userId: user.id,
            date: today,
            missionId: template.id,
            missionType: template.type,
            title: template.title,
            description: template.description,
            target: template.target,
          }
        });
      }
    }

    // Récupérer toutes les missions de l'utilisateur pour aujourd'hui
    const missions = await prisma.dailyMission.findMany({
      where: {
        userId: user.id,
        date: today
      },
      orderBy: { createdAt: 'asc' }
    });

    // Calculer le streak (à implémenter plus tard)
    const streak = 1; // TODO: calculer le vrai streak

    res.json({
      success: true,
      data: {
        currentDate: today,
        missions: missions.map((m: any) => ({
          id: m.missionId,
          type: 'key_combo', // Frontend compatibility
          title: m.title,
          description: m.description,
          target: m.target,
          current: m.current,
          completed: m.completed,
          requiredCombos: [[m.missionType]], // Frontend compatibility
          completedCombos: m.completed ? [[m.missionType]] : [],
        })),
        completed: missions.every((m: any) => m.completed),
        streak,
        lastCompletedDate: missions.some((m: any) => m.completed) ? today : undefined,
      }
    });

  } catch (error) {
    console.error('Error getting user missions:', error);
    res.status(500).json({
      success: false,
      error: 'Error getting user missions'
    });
  }
});

// POST /api/missions/:address/progress - Mettre à jour le progrès d'une mission
router.post('/:address/progress', async (req, res) => {
  try {
    const { address } = req.params;
    const { missionId, increment = 1 } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    if (!address || !missionId) {
      return res.status(400).json({
        success: false,
        error: 'Address and missionId required'
      });
    }

    const user = await getOrCreateUser(address);

    // Trouver la mission
    const mission = await prisma.dailyMission.findUnique({
      where: {
        userId_date_missionId: {
          userId: user.id,
          date: today,
          missionId
        }
      }
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission not found'
      });
    }

    if (mission.completed) {
      return res.json({
        success: true,
        data: {
          mission,
          alreadyCompleted: true
        }
      });
    }

    // Mettre à jour le progrès
    const newCurrent = Math.min(mission.current + increment, mission.target);
    const isCompleted = newCurrent >= mission.target;

    const updatedMission = await prisma.dailyMission.update({
      where: { id: mission.id },
      data: {
        current: newCurrent,
        completed: isCompleted,
        completedAt: isCompleted ? new Date() : null
      }
    });

    console.log(`📊 Mission progress: ${missionId} -> ${newCurrent}/${mission.target}${isCompleted ? ' ✅' : ''}`);

    res.json({
      success: true,
      data: {
        mission: updatedMission,
        justCompleted: isCompleted && !mission.completed
      }
    });

  } catch (error) {
    console.error('Error updating mission progress:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating mission progress'
    });
  }
});

export { router as missionsRoutes };
