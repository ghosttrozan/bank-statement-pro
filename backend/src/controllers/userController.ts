import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';
import Analytics from '../models/Analytics';
import {
  createUser as dbCreateUser,
  getUsers as dbGetUsers,
  softDeleteUser,
  restoreUser,
  banUser,
  unbanUser,
  forceLogout,
  resetPassword as dbResetPassword,
} from '../services/userService';
import { generateAccessToken } from '../services/tokenService';
import { logActivity } from '../services/activityLogService';
import { getLoginHistory } from '../services/loginHistoryService';
import { getActivityLogs } from '../services/activityLogService';
import { exportUsersCSV } from '../services/exportService';
import StatementLog from '../models/StatementLog';
import { getClientIP, parseUserAgent } from '../services/geoService';

// Helper to check validation
const checkValidation = (req: Request, res: Response): boolean => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return false;
  }
  return true;
};

// ── GET /api/users ──
export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { page, limit, search, role, isDeleted } = req.query;

    const options: any = {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      search: search as string,
      role: role as string,
      isDeleted: isDeleted === 'true',
    };

    // If role is ADMIN, only return users managed by this admin
    if (req.user.role === 'ADMIN') {
      options.byAdmin = req.user._id.toString();
      options.role = 'USER'; // Admin can only see USERS
    }

    const result = await dbGetUsers(options);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/users/admins (SUPER_ADMIN only) ──
export const listAdmins = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const result = await dbGetUsers({
      role: 'ADMIN',
      page,
      limit,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/users/deleted (SUPER_ADMIN only) ──
export const listDeletedUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const result = await dbGetUsers({
      isDeleted: true,
      page,
      limit,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/users/:id ──
export const getUserDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById((req.params.id as string));
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── POST /api/users ──
export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!checkValidation(req, res)) return;
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { fullName, username, phoneNumber, password, role, subscription } = req.body;

    // RBAC check: ADMIN can only create USER role
    if (req.user.role === 'ADMIN' && role === 'ADMIN') {
      res.status(403).json({ message: 'Access denied: Admins cannot create Admin accounts' });
      return;
    }

    const user = await dbCreateUser({
      fullName,
      username,
      phoneNumber,
      password,
      role: role || 'USER',
      createdBy: req.user._id.toString(),
      parentAdmin: req.user.role === 'ADMIN' ? req.user._id.toString() : undefined,
      subscription,
    });

    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await logActivity({
      action: user.role === 'ADMIN' ? 'ADMIN_CREATED' : 'USER_CREATED',
      performedBy: req.user._id.toString(),
      targetUser: user._id.toString(),
      ipAddress: ip,
      browser: device.browser,
      device: device.deviceType,
    });

    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// ── PATCH /api/users/:id ──
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!checkValidation(req, res)) return;
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { fullName, phoneNumber, subscription } = req.body;
    const targetUser = await User.findById((req.params.id as string));
    if (!targetUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Update fields
    if (fullName) targetUser.fullName = fullName;
    if (phoneNumber) targetUser.phoneNumber = phoneNumber;

    if (subscription) {
      targetUser.subscription = {
        ...targetUser.subscription,
        ...subscription,
      };
    }

    await targetUser.save();

    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await logActivity({
      action: targetUser.role === 'ADMIN' ? 'ADMIN_UPDATED' : 'USER_UPDATED',
      performedBy: req.user._id.toString(),
      targetUser: targetUser._id.toString(),
      ipAddress: ip,
      browser: device.browser,
      device: device.deviceType,
    });

    res.json(targetUser);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// ── DELETE /api/users/:id (Soft Delete) ──
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await softDeleteUser((req.params.id as string), req.user._id.toString(), {
      ip,
      browser: device.browser,
      device: device.deviceType,
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// ── POST /api/users/:id/restore ──
export const restoreUserEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await restoreUser((req.params.id as string), req.user._id.toString(), {
      ip,
      browser: device.browser,
      device: device.deviceType,
    });

    res.json({ message: 'User restored successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// ── PATCH /api/users/:id/ban ──
export const banUserEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { reason } = req.body;
    if (!reason) {
      res.status(400).json({ message: 'Ban reason is required' });
      return;
    }

    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await banUser((req.params.id as string), req.user._id.toString(), reason, {
      ip,
      browser: device.browser,
      device: device.deviceType,
    });

    res.json({ message: 'User banned successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// ── PATCH /api/users/:id/unban ──
export const unbanUserEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await unbanUser((req.params.id as string), req.user._id.toString(), {
      ip,
      browser: device.browser,
      device: device.deviceType,
    });

    res.json({ message: 'User unbanned successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// ── POST /api/users/:id/force-logout ──
export const forceLogoutEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await forceLogout((req.params.id as string), req.user._id.toString(), {
      ip,
      browser: device.browser,
      device: device.deviceType,
    });

    res.json({ message: 'User forced to log out successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// ── POST /api/users/:id/reset-password ──
export const resetPasswordEndpoint = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!checkValidation(req, res)) return;
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { newPassword } = req.body;
    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await dbResetPassword((req.params.id as string), newPassword, req.user._id.toString(), {
      ip,
      browser: device.browser,
      device: device.deviceType,
    });

    res.json({ message: 'User password reset successfully' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// ── GET /api/users/:id/login-history (SUPER_ADMIN only) ──
export const userLoginHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const result = await getLoginHistory({
      userId: (req.params.id as string),
      page,
      limit,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/users/:id/activity (SUPER_ADMIN only) ──
export const userActivityLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const result = await getActivityLogs({
      userId: (req.params.id as string),
      page,
      limit,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/users/:id/statement-logs ──
export const userStatementLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

    const [logs, total] = await Promise.all([
      StatementLog.find({ userId: (req.params.id as string) })
        .sort({ generatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      StatementLog.countDocuments({ userId: (req.params.id as string) }),
    ]);

    res.json({
      logs,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── Bulk Actions (SUPER_ADMIN only) ──
export const bulkBan = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { userIds, reason } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ message: 'userIds array is required' });
      return;
    }
    if (!reason) {
      res.status(400).json({ message: 'reason is required' });
      return;
    }

    // Exclude SUPER_ADMIN from being banned
    const users = await User.find({ _id: { $in: userIds } });
    const targetUserIds = users
      .filter((u) => u.role !== 'SUPER_ADMIN')
      .map((u) => u._id.toString());

    if (targetUserIds.length === 0) {
      res.status(400).json({ message: 'No modifiable accounts specified' });
      return;
    }

    await User.updateMany(
      { _id: { $in: targetUserIds } },
      { isBanned: true, bannedAt: new Date(), bannedBy: req.user._id, banReason: reason }
    );

    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await logActivity({
      action: 'BULK_BAN',
      performedBy: req.user._id.toString(),
      ipAddress: ip,
      browser: device.browser,
      device: device.deviceType,
      metadata: { count: targetUserIds.length, reason },
    });

    res.json({ message: `Successfully banned ${targetUserIds.length} users` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkDelete = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ message: 'userIds array is required' });
      return;
    }

    // Exclude SUPER_ADMIN from deletion
    const users = await User.find({ _id: { $in: userIds } });
    const targetUserIds = users
      .filter((u) => u.role !== 'SUPER_ADMIN')
      .map((u) => u._id.toString());

    if (targetUserIds.length === 0) {
      res.status(400).json({ message: 'No modifiable accounts specified' });
      return;
    }

    await User.updateMany(
      { _id: { $in: targetUserIds } },
      { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id }
    );

    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await logActivity({
      action: 'BULK_DELETE',
      performedBy: req.user._id.toString(),
      ipAddress: ip,
      browser: device.browser,
      device: device.deviceType,
      metadata: { count: targetUserIds.length },
    });

    res.json({ message: `Successfully deleted ${targetUserIds.length} users` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const bulkForceLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({ message: 'userIds array is required' });
      return;
    }

    const users = await User.find({ _id: { $in: userIds } });
    const targetUserIds = users
      .filter((u) => u.role !== 'SUPER_ADMIN')
      .map((u) => u._id.toString());

    if (targetUserIds.length === 0) {
      res.status(400).json({ message: 'No modifiable accounts specified' });
      return;
    }

    // Increment session versions
    await User.updateMany({ _id: { $in: targetUserIds } }, { $inc: { sessionVersion: 1 } });

    // Revoke all refresh tokens for these users
    const RefreshToken = (await import('../models/RefreshToken')).default;
    await RefreshToken.updateMany({ userId: { $in: targetUserIds }, isRevoked: false }, { isRevoked: true });

    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await logActivity({
      action: 'BULK_FORCE_LOGOUT',
      performedBy: req.user._id.toString(),
      ipAddress: ip,
      browser: device.browser,
      device: device.deviceType,
      metadata: { count: targetUserIds.length },
    });

    res.json({ message: `Successfully logged out ${targetUserIds.length} users` });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── Export Users to CSV (SUPER_ADMIN only) ──
export const exportUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const csvContent = await exportUsersCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv');
    res.send(csvContent);

    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await logActivity({
      action: 'EXPORT_USERS',
      performedBy: req.user._id.toString(),
      ipAddress: ip,
      browser: device.browser,
      device: device.deviceType,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// ── User Impersonation (SUPER_ADMIN only) ──
export const impersonateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const targetUser = await User.findById((req.params.id as string));
    if (!targetUser) {
      res.status(404).json({ message: 'Target user not found' });
      return;
    }

    if (targetUser.role === 'SUPER_ADMIN') {
      res.status(403).json({ message: 'Action denied: Cannot impersonate another SUPER_ADMIN' });
      return;
    }

    // Generate short-lived access token with impersonator data
    const impersonationToken = generateAccessToken(targetUser, {
      originalAdmin: req.user._id.toString(),
    });

    const ip = getClientIP(req);
    const ua = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(ua);

    await logActivity({
      action: 'IMPERSONATION_STARTED',
      performedBy: req.user._id.toString(),
      targetUser: targetUser._id.toString(),
      ipAddress: ip,
      browser: device.browser,
      device: device.deviceType,
    });

    res.json({
      accessToken: impersonationToken,
      user: {
        id: targetUser._id,
        fullName: targetUser.fullName,
        username: targetUser.username,
        phoneNumber: targetUser.phoneNumber,
        role: targetUser.role,
        subscription: targetUser.subscription,
        totalStatementsGenerated: targetUser.totalStatementsGenerated,
        lastSeenAt: targetUser.lastSeenAt,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
