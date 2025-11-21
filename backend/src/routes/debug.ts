import { Router } from 'express';
import { prisma } from '../services/database.js';

const router = Router();

// Endpoint de debug pour tester la connexion DB
router.get('/db-test', async (req, res) => {
  try {
    // Test simple de connexion
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    res.json({
      success: true,
      message: 'Database connection OK',
      result: result
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// CRÉATION FORCÉE DES TABLES
router.get('/create-tables', async (req, res) => {
  try {
    // Créer la table users d'abord
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL,
        "address" TEXT NOT NULL,
        "cubes" INTEGER NOT NULL DEFAULT 0,
        "cubeOpensToday" INTEGER NOT NULL DEFAULT 0,
        "lastCubeOpenDate" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
      )
    `;

    // Créer l'index unique sur address
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "users_address_key" ON "users"("address")
    `;

    // Créer la table DailyMission
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "DailyMission" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "date" TEXT NOT NULL,
        "missionId" TEXT NOT NULL,
        "missionType" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "target" INTEGER NOT NULL,
        "progress" INTEGER NOT NULL DEFAULT 0,
        "completed" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "DailyMission_pkey" PRIMARY KEY ("id")
      )
    `;

    // Créer la table UserSession
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "UserSession" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "signature" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
      )
    `;
    
    res.json({
      success: true,
      message: 'Tables created successfully!'
    });
  } catch (error) {
    console.error('Table creation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// Test de création d'utilisateur simple
router.get('/create-test-user', async (req, res) => {
  try {
    const testAddress = '0x1234567890123456789012345678901234567890';
    
    const user = await prisma.user.upsert({
      where: { address: testAddress },
      update: {},
      create: { address: testAddress }
    });
    
    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

export const debugRoutes = router;
