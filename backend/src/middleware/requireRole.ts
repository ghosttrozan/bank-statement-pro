import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

// ── Check if the authenticated user has one of the allowed roles ──
export const requireRole = (...roles: ('SUPER_ADMIN' | 'ADMIN' | 'USER')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'Access denied: insufficient permissions' });
      return;
    }

    next();
  };
};

// ── Protect SUPER_ADMIN from modification, ban, delete, or role change ──
export const protectSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const targetId = req.params.id;
    if (!targetId) {
      next();
      return;
    }

    // Bypass soft-delete filter to find if a deleted super admin is targeted
    const targetUser = await User.findById(targetId).setOptions({ bypassSoftDelete: true });
    if (!targetUser) {
      res.status(404).json({ message: 'Target user not found' });
      return;
    }

    const isTargetSuperAdmin = targetUser.role === 'SUPER_ADMIN';
    const isSelf = req.user._id.toString() === targetUser._id.toString();

    if (isTargetSuperAdmin) {
      // 1. If not self, block completely (cannot modify/ban/delete another super admin)
      if (!isSelf) {
        res.status(403).json({ message: 'Action denied: SUPER_ADMIN accounts cannot be modified by others' });
        return;
      }

      // 2. If self, block self-harm operations
      // - Self-delete: DELETE method or /delete route
      if (req.method === 'DELETE' || req.path.includes('/delete')) {
        res.status(403).json({ message: 'Action denied: You cannot delete your own SUPER_ADMIN account' });
        return;
      }

      // - Self-ban: BAN route
      if (req.path.includes('/ban')) {
        res.status(403).json({ message: 'Action denied: You cannot ban your own SUPER_ADMIN account' });
        return;
      }

      // - Role change: if role is present in body and is not SUPER_ADMIN
      if (req.body.role && req.body.role !== 'SUPER_ADMIN') {
        res.status(403).json({ message: 'Action denied: You cannot change your own SUPER_ADMIN role' });
        return;
      }
    }

    next();
  } catch (error) {
    console.error('[protectSuperAdmin] Error:', error);
    res.status(500).json({ message: 'Internal server error during security checks' });
  }
};

// ── Enforce that an ADMIN can only manage users they created/own ──
export const requireOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    // SUPER_ADMIN has global access, bypass ownership check
    if (req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    const targetId = req.params.id;
    if (!targetId) {
      next();
      return;
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Non-super-admins cannot manage admins
    if (targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN') {
      res.status(403).json({ message: 'Access denied: You cannot manage other admins' });
      return;
    }

    // If target is USER, check if their parentAdmin matches the current ADMIN user ID
    if (
      targetUser.role === 'USER' &&
      targetUser.parentAdmin?.toString() !== req.user._id.toString()
    ) {
      res.status(403).json({ message: 'Access denied: You do not have permission to manage this user' });
      return;
    }

    next();
  } catch (error) {
    console.error('[requireOwnership] Error:', error);
    res.status(500).json({ message: 'Internal server error during authorization checks' });
  }
};
