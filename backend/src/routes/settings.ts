import { Router } from 'express';
import { body } from 'express-validator';
import { verifyAccessTokenMiddleware } from '../middleware/verifyAccessToken';
import { requireRole } from '../middleware/requireRole';
import { getSettings, updateSettings } from '../controllers/settingsController';

const router = Router();

// Apply auth + SUPER_ADMIN check globally for settings routes
router.use(verifyAccessTokenMiddleware);
router.use(requireRole('SUPER_ADMIN'));

router.get('/', getSettings);

router.patch(
  '/',
  [
    body('applicationName').optional().trim().notEmpty().withMessage('Application name cannot be empty'),
    body('dailyStatementLimit').optional().isInt({ min: -1 }).withMessage('Daily limit must be an integer >= -1'),
    body('maintenanceMode').optional().isBoolean().withMessage('Maintenance mode must be a boolean'),
    body('allowedOrigins').optional().isArray().withMessage('Allowed origins must be an array of strings'),
  ],
  updateSettings
);

export default router;
