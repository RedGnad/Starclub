import { Express } from 'express';
import { dappsRoutes } from './dapps.js';
import { authRoutes } from './auth.js';
import { userRoutes } from './user.js';
import { contractsRoutes } from './contracts.js';
import { protocolsRoutes } from './protocols.js';

export function setupApiRoutes(app: Express) {
  // Test route
  app.get('/api/test', (req, res) => {
    res.json({ 
      message: 'Backend Starclub CONNECTÉ !', 
      version: '2.0.0',
      services: {
        dapps: '✅',
        auth: '✅',
        contracts: '✅',
        protocols: '✅',
        database: '✅'
      }
    });
  });

  // Routes principales
  app.use('/api/dapps', dappsRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/contracts', contractsRoutes);
  app.use('/api/protocols', protocolsRoutes);
}
