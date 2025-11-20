import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import des routes
import { setupApiRoutes } from './routes/index.js';

// Configuration
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://127.0.0.1:3000',
    'https://starclub.vercel.app',
    'https://starclub-starclub-4.vercel.app',
    'https://*.vercel.app'  // Domaines Vercel
  ],
  credentials: true
}));
app.use(express.json());

// Route racine
app.get('/', (req, res) => {
  res.json({ 
    message: 'Starclub Backend API - COMPLET', 
    version: '2.0.0',
    features: [
      'BlockVision Integration',
      'dApp Detection & Discovery', 
      'Contract Analysis',
      'User Interactions Tracking',
      'Intelligent Twitter Followers (Cache + Blockchain)',
      'Admin Interface for Manual Data',
      'Prisma Database'
    ],
    endpoints: {
      health: '/health',
      test: '/api/test',
      dapps: '/api/dapps/*',
      auth: '/api/auth/*',
      user: '/api/user/*',
      contracts: '/api/contracts/*',
      protocols: '/api/protocols/*',
      admin: '/api/admin/*'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Setup des routes API
setupApiRoutes(app);

// Démarrage serveur
app.listen(PORT, () => {
  console.log(`🚀 Starclub Backend COMPLET sur http://localhost:${PORT}`);
  console.log(`📡 CORS autorisé pour http://localhost:3000`);
  console.log(`🔥 Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: ${process.env.DATABASE_URL || 'sqlite://./dev.db'}`);
  console.log(`🔗 BlockVision: ${process.env.BLOCKVISION_API_KEY ? '✅' : '❌'}`);
});
