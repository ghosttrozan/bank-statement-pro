import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken';
import { IUser } from '../models/User';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'change_me_access';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'change_me_refresh';
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_EXPIRY_DAYS = 30;

export interface AccessTokenPayload {
  userId: string;
  role: string;
  sessionVersion: number;
  impersonating?: boolean;
  originalAdmin?: string;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionVersion: number;
}

// ── Generate access token ───────────────────────────────────────
export function generateAccessToken(user: IUser, impersonation?: { originalAdmin: string }): string {
  const payload: AccessTokenPayload = {
    userId: user._id.toString(),
    role: user.role,
    sessionVersion: user.sessionVersion,
    ...(impersonation && { impersonating: true, originalAdmin: impersonation.originalAdmin }),
  };
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY } as jwt.SignOptions);
}

// ── Generate + persist refresh token ───────────────────────────
export async function generateRefreshToken(
  user: IUser,
  meta: { ipAddress?: string; userAgent?: string }
): Promise<string> {
  const rawToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRY_DAYS);

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    sessionVersion: user.sessionVersion,
    expiresAt,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return rawToken;
}

// ── Verify access token ─────────────────────────────────────────
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

// ── Verify + validate refresh token ────────────────────────────
export async function validateRefreshToken(rawToken: string): Promise<RefreshTokenPayload & { tokenHash: string }> {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const record = await RefreshToken.findOne({ tokenHash, isRevoked: false });

  if (!record) throw new Error('Refresh token not found or revoked');
  if (record.expiresAt < new Date()) throw new Error('Refresh token expired');

  return {
    userId: record.userId.toString(),
    sessionVersion: record.sessionVersion,
    tokenHash,
  };
}

// ── Revoke single refresh token ─────────────────────────────────
export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await RefreshToken.findOneAndUpdate({ tokenHash }, { isRevoked: true });
}

// ── Revoke ALL tokens for a user (force logout) ─────────────────
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await RefreshToken.updateMany({ userId, isRevoked: false }, { isRevoked: true });
}
