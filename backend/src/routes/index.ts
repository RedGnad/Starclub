import { Express } from 'express';
import { dappsRoutes } from './dapps.js';
import { authRoutes } from './auth.js';
import { userRoutes } from './user.js';
import { contractsRoutes } from './contracts.js';
import { protocolsRoutes } from './protocols.js';
import { adminRoutes } from './admin.js';
import { cubesRoutes } from './cubes.js';
import { sessionsRoutes } from './sessions.js';
import { missionsRoutes } from './missions.js';
import { simpleMissionsRoutes } from './missions-simple.js';
import { cubeLimitRoutes } from './cubeLimit.js';
import { debugRoutes } from './debug.js';

export function setupApiRoutes(app: Express) {
  // Test route
  app.get('/api/test', (req, res) => {
    res.json({ 
      message: 'Backend Starclub CONNECTED !', 
      version: '2.0.0',
      services: {
        dapps: '✅',
        auth: '✅',
        user: '✅',
        contracts: '✅',
        protocols: '✅',
        admin: '✅',
        cubes: '✅',
        sessions: '✅',
        missions: '✅',
        cubeLimit: '✅'
      }
    });
  });

  // Routes principales
  app.use('/api/dapps', dappsRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/contracts', contractsRoutes);
  app.use('/api/protocols', protocolsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/cubes', cubesRoutes);
  app.use('/api/sessions', sessionsRoutes);
  app.use('/api/missions', missionsRoutes);
  app.use('/api/missions-simple', simpleMissionsRoutes);
  app.use('/api/cube-limit', cubeLimitRoutes);
  app.use('/api/debug', debugRoutes);
}
