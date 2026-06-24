import { Router } from 'express';
import { verifyAccessTokenMiddleware } from '../middleware/verifyAccessToken';
import { requireRole } from '../middleware/requireRole';
import {
  listActivityLogs,
  listLoginHistory,
  exportActivityLogs,
  exportLoginHistory,
} from '../controllers/activityController';

const router = Router();

// Apply auth + SUPER_ADMIN check globally for activity logs routes
router.use(verifyAccessTokenMiddleware);
router.use(requireRole('SUPER_ADMIN'));

router.get('/', listActivityLogs);
router.get('/login-history', listLoginHistory);
router.get('/export/activity-logs', exportActivityLogs);
router.get('/export/login-history', exportLoginHistory);

export default router;
