import { Request, Response } from 'express';
import { incrementStatementCount } from '../services/analyticsService';
import StatementLog from '../models/StatementLog';
import Settings from '../models/Settings';
import Analytics from '../models/Analytics';
import User from '../models/User';
import { getClientIP, parseUserAgent } from '../services/geoService';
import { exportStatementLogsCSV } from '../services/exportService';
import { logActivity } from '../services/activityLogService';

// ── POST /api/statements/increment ──
export const incrementStatement = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userId = req.user._id.toString();
    const userRole = req.user.role;

    // 1. Check user subscription maxStatements limit (only enforce for non-SUPER_ADMIN/ADMIN if desired, but standard is enforce for all or based on plan)
    // -1 means unlimited
    if (req.user.subscription.maxStatements !== -1 && req.user.totalStatementsGenerated >= req.user.subscription.maxStatements) {
      res.status(403).json({
        message: `Limit reached: Your subscription plan (${req.user.subscription.plan}) allows a maximum of ${req.user.subscription.maxStatements} statements.`,
      });
      return;
    }

    // 2. Check system-wide dailyStatementLimit from settings
    const settings = await Settings.findOne();
    const dailyLimit = settings ? settings.dailyStatementLimit : 100; // default 100 if no settings doc yet

    if (dailyLimit !== -1) {
      const today = new Date().toISOString().slice(0, 10);
      const analytics = await Analytics.findOne({ userId });

      if (analytics && analytics.lastDailyReset === today && analytics.todayGenerated >= dailyLimit) {
        res.status(403).json({
          message: `System-wide limit reached: You cannot generate more than ${dailyLimit} statements per day.`,
        });
        return;
      }
    }

    // Get request details
    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    // Call service to increment count and log statement
    await incrementStatementCount(
      userId,
      userRole,
      ip,
      device.deviceType,
      req.user.sessionVersion
    );

    // Write activity log (fire-and-forget)
    logActivity({
      action: 'STATEMENT_GENERATED',
      performedBy: userId,
      ipAddress: ip,
      browser: device.browser,
      device: device.deviceType,
    }).catch(err => console.error('[StatementController] activity logging failed:', err));

    res.json({ message: 'Statement count incremented successfully' });
  } catch (error: any) {
    console.error('[StatementController] Increment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── GET /api/statements/logs (SUPER_ADMIN only) ──
export const listStatementLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const [logs, total] = await Promise.all([
      StatementLog.find({})
        .populate('userId', 'fullName username role')
        .sort({ generatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      StatementLog.countDocuments({}),
    ]);

    res.json({
      logs,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('[StatementController] listStatementLogs error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/statements/logs/user/:id ──
export const listUserStatementLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const targetUserId = (req.params.id as string);

    const [logs, total] = await Promise.all([
      StatementLog.find({ userId: targetUserId })
        .sort({ generatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      StatementLog.countDocuments({ userId: targetUserId }),
    ]);

    res.json({
      logs,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('[StatementController] listUserStatementLogs error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/statements/export/csv (SUPER_ADMIN only) ──
export const exportStatementLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const csvContent = await exportStatementLogsCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=statement_logs_export.csv');
    res.send(csvContent);

    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await logActivity({
      action: 'EXPORT_ACTIVITY_LOGS', // Or a custom export statement action
      performedBy: req.user._id.toString(),
      ipAddress: ip,
      browser: device.browser,
      device: device.deviceType,
    });
  } catch (error: any) {
    console.error('[StatementController] exportStatementLogs error:', error);
    res.status(500).json({ message: error.message });
  }
};
