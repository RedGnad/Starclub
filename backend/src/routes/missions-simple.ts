import { Router } from 'express';
import { prisma } from '../services/database.js';

const router = Router();

// GET /api/missions-simple/:address - Version SQL DIRECTE
router.get('/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Créer utilisateur en SQL direct
    await prisma.$executeRaw`
      INSERT INTO users (id, address, "createdAt", "updatedAt") 
      VALUES (${`user_${Date.now()}`}, ${address.toLowerCase()}, NOW(), NOW())
      ON CONFLICT (address) DO NOTHING
    `;
    
    // 2. Récupérer l'utilisateur
    const user = await prisma.$queryRaw`
      SELECT * FROM users WHERE address = ${address.toLowerCase()} LIMIT 1
    `;
    
    if (!user || (user as any[]).length === 0) {
      throw new Error('User not found');
    }
    
    const userId = (user as any[])[0].id;
    
    // NETTOYAGE: Supprimer les doublons existants pour cet utilisateur/date
    await prisma.$executeRaw`
      DELETE FROM daily_missions 
      WHERE "userId" = ${userId} AND date = ${today}
    `;
    
    // 3. Créer 4 missions directement en SQL
    const missions = [
      { id: `check_in_${today}`, type: 'daily_checkin', title: 'Daily Check-in', desc: 'Connect and open the application', target: 1 },
      { id: `discovery_arcade_${today}`, type: 'discovery_arcade', title: 'Discovery Arcade', desc: 'Open the Discovery Arcade modal', target: 1 },
      { id: `cube_activations_${today}`, type: 'cube_activator', title: 'Cube Activator', desc: 'Open 3 cube mission modals', target: 3 },
      { id: `cube_completions_${today}`, type: 'cube_master', title: 'Cube Master', desc: 'Complete all daily missions by opening cubes', target: 1 }
    ];
    
    for (const mission of missions) {
      await prisma.$executeRaw`
        INSERT INTO daily_missions (id, "userId", date, "missionId", "missionType", title, description, target, progress, completed, "createdAt", "updatedAt")
        VALUES (${mission.id}, ${userId}, ${today}, ${mission.id}, ${mission.type}, ${mission.title}, ${mission.desc}, ${mission.target}, 0, false, NOW(), NOW())
        ON CONFLICT ("userId", date, "missionId") DO NOTHING
      `;
    }
    
    // 4. Récupérer les missions
    const userMissions = await prisma.$queryRaw`
      SELECT * FROM daily_missions WHERE "userId" = ${userId} AND date = ${today}
    `;
    
    res.json({
      success: true,
      data: {
        currentDate: today,
        missions: userMissions,
        completed: false,
        streak: 1
      }
    });
    
  } catch (error) {
    console.error('Mission error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/missions-simple/:address/progress - Mettre à jour le progrès
router.post('/:address/progress', async (req, res) => {
  try {
    const { address } = req.params;
    const { missionId, increment = 1 } = req.body;
    
    // 1. Récupérer l'utilisateur
    const user = await prisma.$queryRaw`
      SELECT * FROM users WHERE address = ${address.toLowerCase()} LIMIT 1
    `;
    
    if (!user || (user as any[]).length === 0) {
      throw new Error('User not found');
    }
    
    const userId = (user as any[])[0].id;
    const today = new Date().toISOString().split('T')[0];
    
    // 2. Mettre à jour la mission en SQL direct
    await prisma.$executeRaw`
      UPDATE daily_missions 
      SET progress = progress + ${increment}, 
          "updatedAt" = NOW(),
          completed = CASE WHEN (progress + ${increment}) >= target THEN true ELSE completed END
      WHERE "userId" = ${userId} AND date = ${today} AND "missionId" = ${missionId}
    `;
    
    // 3. Récupérer la mission mise à jour
    const updatedMission = await prisma.$queryRaw`
      SELECT * FROM daily_missions 
      WHERE "userId" = ${userId} AND date = ${today} AND "missionId" = ${missionId}
      LIMIT 1
    `;
    
    res.json({
      success: true,
      data: {
        mission: (updatedMission as any[])[0],
        justCompleted: (updatedMission as any[])[0]?.completed === true,
      }
    });
    
  } catch (error) {
    console.error('Update mission progress error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export const simpleMissionsRoutes = router;
