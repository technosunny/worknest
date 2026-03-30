import { Router } from 'express';
import { login, refreshToken, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/refresh', refreshToken);

// Protected routes
router.post('/change-password', authenticate, changePassword);

export default router;
