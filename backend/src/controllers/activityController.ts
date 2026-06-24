import { Request, Response } from 'express';
import { getActivityLogs } from '../services/activityLogService';
import { getLoginHistory } from '../services/loginHistoryService';
import { exportActivityLogsCSV, exportLoginHistoryCSV } from '../services/exportService';
import { getClientIP, parseUserAgent } from '../services/geoService';
import { logActivity } from '../services/activityLogService';
import { ActivityAction } from '../models/ActivityLog';

// ── GET /api/activity (SUPER_ADMIN only) ──
export const listActivityLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const userId = req.query.userId as string;
    const action = req.query.action as ActivityAction;
    const startDateStr = req.query.startDate as string;
    const endDateStr = req.query.endDate as string;

    const options: any = { page, limit };
    if (userId) options.userId = userId;
    if (action) options.action = action;
    if (startDateStr) options.startDate = new Date(startDateStr);
    if (endDateStr) options.endDate = new Date(endDateStr);

    const result = await getActivityLogs(options);
    res.json(result);
  } catch (error: any) {
    console.error('[ActivityController] listActivityLogs error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/activity/login-history (SUPER_ADMIN only) ──
export const listLoginHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const userId = req.query.userId as string;

    const result = await getLoginHistory({
      userId,
      page,
      limit,
    });
    res.json(result);
  } catch (error: any) {
    console.error('[ActivityController] listLoginHistory error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/activity/export/activity-logs (SUPER_ADMIN only) ──
export const exportActivityLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const csvContent = await exportActivityLogsCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=activity_logs_export.csv');
    res.send(csvContent);

    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await logActivity({
      action: 'EXPORT_ACTIVITY_LOGS',
      performedBy: req.user._id.toString(),
      ipAddress: ip,
      browser: device.browser,
      device: device.deviceType,
    });
  } catch (error: any) {
    console.error('[ActivityController] exportActivityLogs error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/activity/export/login-history (SUPER_ADMIN only) ──
export const exportLoginHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const csvContent = await exportLoginHistoryCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=login_history_export.csv');
    res.send(csvContent);

    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await logActivity({
      action: 'EXPORT_LOGIN_HISTORY',
      performedBy: req.user._id.toString(),
      ipAddress: ip,
      browser: device.browser,
      device: device.deviceType,
    });
  } catch (error: any) {
    console.error('[ActivityController] exportLoginHistory error:', error);
    res.status(500).json({ message: error.message });
  }
};
