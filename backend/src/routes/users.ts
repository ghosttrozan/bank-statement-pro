import { Router } from 'express';
import { body } from 'express-validator';
import { verifyAccessTokenMiddleware } from '../middleware/verifyAccessToken';
import { requireRole, protectSuperAdmin, requireOwnership } from '../middleware/requireRole';
import {
  listUsers,
  listAdmins,
  listDeletedUsers,
  getUserDetail,
  createUser,
  updateUser,
  deleteUser,
  restoreUserEndpoint,
  banUserEndpoint,
  unbanUserEndpoint,
  forceLogoutEndpoint,
  resetPasswordEndpoint,
  userLoginHistory,
  userActivityLogs,
  userStatementLogs,
  bulkBan,
  bulkDelete,
  bulkForceLogout,
  exportUsers,
  impersonateUser,
} from '../controllers/userController';

const router = Router();

// Apply auth check globally on users route
router.use(verifyAccessTokenMiddleware);

// ── Super Admin Specific Routes ──
router.get('/admins', requireRole('SUPER_ADMIN'), listAdmins);
router.get('/deleted', requireRole('SUPER_ADMIN'), listDeletedUsers);
router.get('/export/csv', requireRole('SUPER_ADMIN'), exportUsers);

router.post('/bulk/ban', requireRole('SUPER_ADMIN'), bulkBan);
router.post('/bulk/delete', requireRole('SUPER_ADMIN'), bulkDelete);
router.post('/bulk/force-logout', requireRole('SUPER_ADMIN'), bulkForceLogout);

router.post('/:id/restore', requireRole('SUPER_ADMIN'), restoreUserEndpoint);
router.post('/:id/impersonate', requireRole('SUPER_ADMIN'), impersonateUser);

router.get('/:id/login-history', requireRole('SUPER_ADMIN'), userLoginHistory);
router.get('/:id/activity', requireRole('SUPER_ADMIN'), userActivityLogs);

// ── General User Management ──
router.get('/', requireRole('SUPER_ADMIN', 'ADMIN'), listUsers);

router.post(
  '/',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('username')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username must contain only alphanumeric characters or underscores'),
    body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('role').optional().isIn(['ADMIN', 'USER']).withMessage('Role must be ADMIN or USER'),
  ],
  createUser
);

router.get('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), requireOwnership, getUserDetail);

router.patch(
  '/:id',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  requireOwnership,
  protectSuperAdmin,
  [
    body('fullName').optional().trim().notEmpty().withMessage('Full name cannot be empty'),
    body('phoneNumber').optional().trim().notEmpty().withMessage('Phone number cannot be empty'),
    body('subscription.plan').optional().isIn(['FREE', 'BASIC', 'PRO', 'ENTERPRISE']).withMessage('Invalid plan'),
    body('subscription.status').optional().isIn(['ACTIVE', 'INACTIVE', 'EXPIRED', 'SUSPENDED']).withMessage('Invalid status'),
  ],
  updateUser
);

router.delete('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), requireOwnership, protectSuperAdmin, deleteUser);

router.patch('/:id/ban', requireRole('SUPER_ADMIN', 'ADMIN'), requireOwnership, protectSuperAdmin, banUserEndpoint);
router.patch('/:id/unban', requireRole('SUPER_ADMIN', 'ADMIN'), requireOwnership, protectSuperAdmin, unbanUserEndpoint);
router.post('/:id/force-logout', requireRole('SUPER_ADMIN', 'ADMIN'), requireOwnership, protectSuperAdmin, forceLogoutEndpoint);

router.post(
  '/:id/reset-password',
  requireRole('SUPER_ADMIN', 'ADMIN'),
  requireOwnership,
  protectSuperAdmin,
  [
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long'),
  ],
  resetPasswordEndpoint
);

router.get('/:id/statement-logs', requireRole('SUPER_ADMIN', 'ADMIN'), requireOwnership, userStatementLogs);

export default router;
