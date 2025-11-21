import { PrismaClient } from '@prisma/client';

// Instance Prisma globale
export const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Connecter à la DB au démarrage
export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

// Déconnecter proprement
export async function disconnectDatabase() {
  await prisma.$disconnect();
  console.log('👋 Database disconnected');
}

// Helper: obtenir ou créer un utilisateur
export async function getOrCreateUser(address: string) {
  const normalizedAddress = address.toLowerCase();
  
  let user = await prisma.user.findUnique({
    where: { address: normalizedAddress }
  });
  
  if (!user) {
    // Génération manuelle d'ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    user = await prisma.user.create({
      data: { 
        id: userId,
        address: normalizedAddress 
      }
    });
    console.log(`👤 New user created: ${normalizedAddress}`);
  }
  
  return user;
}
