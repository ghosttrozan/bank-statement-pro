import { Router } from 'express';
import { verifyAccessTokenMiddleware } from '../middleware/verifyAccessToken';
import { requireRole, requireOwnership } from '../middleware/requireRole';
import { statementLimiter } from '../middleware/rateLimiter';
import {
  incrementStatement,
  listStatementLogs,
  listUserStatementLogs,
  exportStatementLogs,
} from '../controllers/statementController';

const router = Router();

// Apply auth check globally on statement route
router.use(verifyAccessTokenMiddleware);

// Increment counter (non-blocking log creation, subject to statement rate limiting)
router.post('/increment', statementLimiter, incrementStatement);

// Super admin specific log viewing and export
router.get('/logs', requireRole('SUPER_ADMIN'), listStatementLogs);
router.get('/export/csv', requireRole('SUPER_ADMIN'), exportStatementLogs);

// Single user statement logs (accessible by Super Admin or managing Admin)
router.get('/logs/user/:id', requireRole('SUPER_ADMIN', 'ADMIN'), requireOwnership, listUserStatementLogs);

export default router;
