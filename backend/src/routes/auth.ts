import { Router } from 'express';

const router = Router();

// POST /api/auth/nonce - Générer nonce pour SIWE
router.post('/nonce', async (req, res) => {
  try {
    // Générer un nonce simple pour l'instant
    const nonce = Math.random().toString(36).substring(7);
    
    res.json({
      success: true,
      data: { nonce }
    });

  } catch (error) {
    console.error('Error generating nonce:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du nonce'
    });
  }
});

// POST /api/auth/verify - Vérifier signature SIWE
router.post('/verify', async (req, res) => {
  try {
    const { message, signature, address } = req.body;

    // TODO: Implémenter vérification SIWE complète
    console.log('SIWE verification request:', { message, signature, address });

    res.json({
      success: true,
      data: {
        verified: true,
        address,
        message: 'Signature vérifiée avec succès'
      }
    });

  } catch (error) {
    console.error('Error verifying SIWE:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification'
    });
  }
});

export { router as authRoutes };
