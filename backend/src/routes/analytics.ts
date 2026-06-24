import { Router } from 'express';
import { verifyAccessTokenMiddleware } from '../middleware/verifyAccessToken';
import { requireRole, requireOwnership } from '../middleware/requireRole';
import {
  getSuperAdminDashboardData,
  getAdminDashboardData,
  getUserAnalytics,
  getStatementsPerDay,
  getStatementsPerMonth,
  getUserGrowth,
  getTopGeneratorsList,
  getDashboardOverview,
} from '../controllers/analyticsController';

const router = Router();

// Apply auth middleware globally on analytics routes
router.use(verifyAccessTokenMiddleware);

// Dashboard routes based on roles
router.get('/overview', requireRole('SUPER_ADMIN', 'ADMIN'), getDashboardOverview);
router.get('/super-dashboard', requireRole('SUPER_ADMIN'), getSuperAdminDashboardData);
router.get('/admin-dashboard', requireRole('ADMIN'), getAdminDashboardData);
router.get('/user/:id', requireRole('SUPER_ADMIN', 'ADMIN'), requireOwnership, getUserAnalytics);

// Chart endpoints for super admin
router.get('/charts/statements-per-day', requireRole('SUPER_ADMIN'), getStatementsPerDay);
router.get('/charts/statements-per-month', requireRole('SUPER_ADMIN'), getStatementsPerMonth);
router.get('/charts/user-growth', requireRole('SUPER_ADMIN'), getUserGrowth);
router.get('/charts/top-generators', requireRole('SUPER_ADMIN'), getTopGeneratorsList);

export default router;
