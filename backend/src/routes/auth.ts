import { Router } from 'express';
import { body } from 'express-validator';
import { login, refresh, logout, logoutAll, getMe, changePassword } from '../controllers/authController';
import { verifyAccessTokenMiddleware } from '../middleware/verifyAccessToken';
import { loginLimiter, refreshLimiter } from '../middleware/rateLimiter';

const router = Router();

// ── Public Routes with specific rate limiting ──
router.post(
  '/login',
  loginLimiter,
  [
    body('loginIdentifier').trim().notEmpty().withMessage('Username or phone number is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  login
);

router.post('/refresh', refreshLimiter, refresh);

// ── Authenticated Routes ──
router.post('/logout', verifyAccessTokenMiddleware, logout);
router.post('/logout-all', verifyAccessTokenMiddleware, logoutAll);
router.get('/me', verifyAccessTokenMiddleware, getMe);
router.patch(
  '/change-password',
  verifyAccessTokenMiddleware,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),
  ],
  changePassword
);

export default router;
