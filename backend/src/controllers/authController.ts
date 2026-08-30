import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import User from '../models/User';
import {
  generateAccessToken,
  generateRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from '../services/tokenService';
import {
  findByUsernameWithPassword,
  findByPhoneWithPassword,
  comparePassword,
  hashPassword,
} from '../services/userService';
import { parseUserAgent, getGeoFromIP, getClientIP } from '../services/geoService';
import { recordLogin } from '../services/loginHistoryService';
import { logActivity } from '../services/activityLogService';

const COOKIE_NAME = 'refreshToken';

const setRefreshTokenCookie = (res: Response, token: string) => {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/', // root path so all routes have access
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

const clearRefreshTokenCookie = (res: Response) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  });
};

// ── Login Handler ──
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { loginIdentifier, password } = req.body; // loginIdentifier can be username or phone

    // Find user (by username or phone, load passwordHash)
    let user = await findByUsernameWithPassword(loginIdentifier);
    if (!user) {
      user = await findByPhoneWithPassword(loginIdentifier);
    }

    if (!user) {
      res.status(401).json({ message: 'Invalid username/phone or password' });
      return;
    }

    // Check password
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid username/phone or password' });
      return;
    }

    // Check if banned
    if (user.isBanned) {
      res.status(403).json({
        message: 'Your account has been banned',
        reason: user.banReason,
      });
      return;
    }

    // Parse location and device metadata
    const userAgentStr = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(userAgentStr);
    const ip = getClientIP(req);
    const geo = await getGeoFromIP(ip);

    // Update user device and location info
    user.lastIPAddress = ip;
    user.lastLocation = geo;
    user.lastDeviceInfo = device;
    user.lastSeenAt = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user, { ipAddress: ip, userAgent: userAgentStr });

    // Set refresh token cookie
    setRefreshTokenCookie(res, refreshToken);

    // Record login in history and log activity
    await recordLogin(user._id.toString(), device, geo, ip);
    await logActivity({
      action: 'LOGIN',
      performedBy: user._id.toString(),
      ipAddress: ip,
      browser: device.browser,
      device: device.deviceType,
    });

    // Send response (exclude passwordHash)
    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        phoneNumber: user.phoneNumber,
        role: user.role,
        subscription: user.subscription,
        totalStatementsGenerated: user.totalStatementsGenerated,
        lastSeenAt: user.lastSeenAt,
      },
    });
  } catch (error) {
    console.error('[AuthController] Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Refresh Token Rotation ──
export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawRefreshToken = req.cookies[COOKIE_NAME] || req.body?.refreshToken || (req.headers['x-refresh-token'] as string);
    if (!rawRefreshToken) {
      res.status(401).json({ message: 'Refresh token not found' });
      return;
    }

    let tokenData;
    try {
      tokenData = await validateRefreshToken(rawRefreshToken);
    } catch (err: any) {
      // Invalidate and clear cookie
      clearRefreshTokenCookie(res);
      res.status(401).json({ message: 'Invalid or expired refresh token', error: err.message });
      return;
    }

    const user = await User.findById(tokenData.userId);
    if (!user || user.isBanned) {
      clearRefreshTokenCookie(res);
      res.status(401).json({ message: 'User not found or account banned' });
      return;
    }

    // If sessionVersion changed, all refresh tokens are invalid
    if (user.sessionVersion !== tokenData.sessionVersion) {
      clearRefreshTokenCookie(res);
      res.status(401).json({ message: 'Session expired' });
      return;
    }

    // Refresh Token Rotation (RTR): Revoke the old token hash and generate a new one
    await revokeRefreshToken(tokenData.tokenHash);

    const userAgentStr = (req.headers['user-agent'] as string) || '';
    const ip = getClientIP(req);

    // Generate new tokens
    const accessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(user, { ipAddress: ip, userAgent: userAgentStr });

    // Set new refresh token cookie
    setRefreshTokenCookie(res, newRefreshToken);

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error('[AuthController] Refresh error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Logout ──
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawRefreshToken = req.cookies[COOKIE_NAME];
    if (rawRefreshToken) {
      const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      await revokeRefreshToken(tokenHash);
    }

    clearRefreshTokenCookie(res);

    if (req.user) {
      const ip = getClientIP(req);
      const userAgentStr = (req.headers['user-agent'] as string) || '';
      const device = parseUserAgent(userAgentStr);

      await logActivity({
        action: 'LOGOUT',
        performedBy: req.user._id.toString(),
        ipAddress: ip,
        browser: device.browser,
        device: device.deviceType,
      });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('[AuthController] Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Logout All Sessions (Force Logout) ──
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const userId = req.user._id.toString();

    // Invalidate sessions by incrementing sessionVersion
    await User.findByIdAndUpdate(userId, { $inc: { sessionVersion: 1 } });
    await revokeAllUserTokens(userId);

    clearRefreshTokenCookie(res);

    const ip = getClientIP(req);
    const userAgentStr = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(userAgentStr);

    await logActivity({
      action: 'FORCE_LOGOUT',
      performedBy: userId,
      targetUser: userId,
      ipAddress: ip,
      browser: device.browser,
      device: device.deviceType,
    });

    res.json({ message: 'Logged out of all sessions successfully' });
  } catch (error) {
    console.error('[AuthController] LogoutAll error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ── Get Me ──
export const getMe = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
  res.json({
    user: {
      id: req.user._id,
      fullName: req.user.fullName,
      username: req.user.username,
      phoneNumber: req.user.phoneNumber,
      role: req.user.role,
      subscription: req.user.subscription,
      totalStatementsGenerated: req.user.totalStatementsGenerated,
      lastSeenAt: req.user.lastSeenAt,
    },
  });
};

// ── Change Password (Self) ──
export const changePassword = async (req: Request, res: Response): Promise<void> => {
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

    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id.toString();

    // Find user with passwordHash
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ message: 'Current password is incorrect' });
      return;
    }

    const newHash = await hashPassword(newPassword);
    user.passwordHash = newHash;
    user.sessionVersion += 1; // Invalidate other tokens
    await user.save();

    // Revoke all tokens
    await revokeAllUserTokens(userId);
    clearRefreshTokenCookie(res);

    const ip = getClientIP(req);
    const userAgentStr = (req.headers['user-agent'] as string) || '';
    const device = parseUserAgent(userAgentStr);

    await logActivity({
      action: 'PASSWORD_CHANGED',
      performedBy: userId,
      ipAddress: ip,
      browser: device.browser,
      device: device.deviceType,
    });

    res.json({ message: 'Password changed successfully. Please log in again.' });
  } catch (error) {
    console.error('[AuthController] Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
