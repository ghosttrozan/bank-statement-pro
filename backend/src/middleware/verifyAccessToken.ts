import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/tokenService';
import User from '../models/User';

export const verifyAccessTokenMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Authorization token required' });
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      res.status(401).json({ message: 'Invalid authorization header format' });
      return;
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err: any) {
      res.status(401).json({ message: 'Invalid or expired access token', error: err.message });
      return;
    }

    // Fetch user from DB (excluding passwordHash, soft-deleted are automatically excluded by pre-find)
    const user = await User.findById(payload.userId);
    if (!user) {
      res.status(401).json({ message: 'User not found or account deactivated' });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({ message: 'Your account has been banned', reason: user.banReason });
      return;
    }

    // Verify sessionVersion matches token. If sessionVersion was bumped, old tokens are invalidated.
    if (user.sessionVersion !== payload.sessionVersion) {
      res.status(401).json({ message: 'Session expired. Please log in again.' });
      return;
    }

    // Update lastSeenAt asynchronously
    user.lastSeenAt = new Date();
    user.save().catch((e) => console.error('[verifyAccessToken] Failed to update lastSeenAt:', e));

    // Attach user and impersonator info to req
    req.user = user;
    if (payload.impersonating && payload.originalAdmin) {
      req.impersonatorId = payload.originalAdmin;
    }

    next();
  } catch (error) {
    console.error('[verifyAccessToken] Middleware error:', error);
    res.status(500).json({ message: 'Internal server error during authentication' });
  }
};
