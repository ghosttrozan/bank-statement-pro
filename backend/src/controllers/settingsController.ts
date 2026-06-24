import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Settings from '../models/Settings';
import { logActivity } from '../services/activityLogService';
import { getClientIP, parseUserAgent } from '../services/geoService';

// Helper to get or initialize settings document
const getOrInitSettings = async () => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({
      applicationName: 'StatementPro',
      dailyStatementLimit: 100,
      maintenanceMode: false,
      allowedOrigins: ['http://localhost:3000'],
    });
  }
  return settings;
};

// ── GET /api/settings ──
export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = await getOrInitSettings();
    res.json(settings);
  } catch (error: any) {
    console.error('[SettingsController] getSettings error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── PATCH /api/settings ──
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { applicationName, logoUrl, dailyStatementLimit, maintenanceMode, allowedOrigins } = req.body;

    const settings = await getOrInitSettings();

    // Track old values for metadata log if helpful
    const oldValues = {
      applicationName: settings.applicationName,
      dailyStatementLimit: settings.dailyStatementLimit,
      maintenanceMode: settings.maintenanceMode,
    };

    if (applicationName !== undefined) settings.applicationName = applicationName;
    if (logoUrl !== undefined) settings.logoUrl = logoUrl;
    if (dailyStatementLimit !== undefined) settings.dailyStatementLimit = dailyStatementLimit;
    if (maintenanceMode !== undefined) settings.maintenanceMode = maintenanceMode;
    if (allowedOrigins !== undefined) settings.allowedOrigins = allowedOrigins;

    settings.updatedBy = req.user._id;
    settings.updatedAt = new Date();

    await settings.save();

    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await logActivity({
      action: 'SETTINGS_UPDATED',
      performedBy: req.user._id.toString(),
      ipAddress: ip,
      browser: device.browser,
      device: device.deviceType,
      metadata: {
        changes: {
          applicationName: applicationName !== undefined ? { old: oldValues.applicationName, new: applicationName } : undefined,
          dailyStatementLimit: dailyStatementLimit !== undefined ? { old: oldValues.dailyStatementLimit, new: dailyStatementLimit } : undefined,
          maintenanceMode: maintenanceMode !== undefined ? { old: oldValues.maintenanceMode, new: maintenanceMode } : undefined,
        },
      },
    });

    res.json(settings);
  } catch (error: any) {
    console.error('[SettingsController] updateSettings error:', error);
    res.status(500).json({ message: error.message });
  }
};
