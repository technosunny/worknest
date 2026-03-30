import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendNotFound } from '../utils/response.utils';

const router = Router();

// GET /api/public/branding/:slug — no auth required
router.get('/branding/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const org = await prisma.organisation.findUnique({
      where: { slug },
      select: {
        name: true,
        slug: true,
        logo_url: true,
        brand_colour: true,
      },
    });

    if (!org) {
      sendNotFound(res, 'Organisation not found');
      return;
    }

    sendSuccess(res, org, 'Branding retrieved');
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
