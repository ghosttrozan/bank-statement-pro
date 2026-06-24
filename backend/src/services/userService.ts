import bcrypt from 'bcryptjs';
import User, { IUser } from '../models/User';
import Analytics from '../models/Analytics';
import { logActivity } from './activityLogService';

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createUser(data: {
  fullName: string;
  username: string;
  phoneNumber: string;
  password: string;
  role: 'ADMIN' | 'USER';
  createdBy: string;
  parentAdmin?: string;
  subscription?: Partial<IUser['subscription']>;
}): Promise<IUser> {
  const existing = await User.findOne({
    $or: [{ username: data.username.toLowerCase() }, { phoneNumber: data.phoneNumber }],
  });
  if (existing) throw new Error('Username or phone number already exists');

  const passwordHash = await hashPassword(data.password);

  const user = await User.create({
    fullName: data.fullName,
    username: data.username.toLowerCase(),
    phoneNumber: data.phoneNumber,
    passwordHash,
    role: data.role,
    createdBy: data.createdBy,
    parentAdmin: data.parentAdmin || data.createdBy,
    subscription: data.subscription || {},
  });

  // Create analytics record
  await Analytics.create({ userId: user._id });

  return user;
}

export async function findByUsernameWithPassword(username: string): Promise<IUser | null> {
  return User.findOne({ username: username.toLowerCase() }).select('+passwordHash');
}

export async function findByPhoneWithPassword(phone: string): Promise<IUser | null> {
  return User.findOne({ phoneNumber: phone }).select('+passwordHash');
}

export async function getUserById(id: string): Promise<IUser | null> {
  return User.findById(id).lean() as Promise<IUser | null>;
}

export async function softDeleteUser(
  targetId: string,
  deletedBy: string,
  meta: { ip?: string; browser?: string; device?: string }
): Promise<void> {
  const user = await User.findById(targetId);
  if (!user) throw new Error('User not found');
  if (user.role === 'SUPER_ADMIN') throw new Error('Cannot delete SUPER_ADMIN');

  await User.findByIdAndUpdate(targetId, {
    isDeleted: true,
    deletedAt: new Date(),
    deletedBy,
  });

  await logActivity({
    action: user.role === 'ADMIN' ? 'ADMIN_DELETED' : 'USER_DELETED',
    performedBy: deletedBy,
    targetUser: targetId,
    ipAddress: meta.ip, browser: meta.browser, device: meta.device,
  });
}

export async function restoreUser(
  targetId: string,
  restoredBy: string,
  meta: { ip?: string; browser?: string; device?: string }
): Promise<void> {
  await User.findByIdAndUpdate(
    targetId,
    { isDeleted: false, $unset: { deletedAt: '', deletedBy: '' } },
    { bypassSoftDelete: true } as object
  );
  await logActivity({ action: 'USER_RESTORED', performedBy: restoredBy, targetUser: targetId, ...meta });
}

export async function banUser(
  targetId: string,
  bannedBy: string,
  reason: string,
  meta: { ip?: string; browser?: string; device?: string }
): Promise<void> {
  const user = await User.findById(targetId);
  if (!user) throw new Error('User not found');
  if (user.role === 'SUPER_ADMIN') throw new Error('Cannot ban SUPER_ADMIN');

  await User.findByIdAndUpdate(targetId, { isBanned: true, bannedAt: new Date(), bannedBy, banReason: reason });
  await logActivity({ action: 'USER_BANNED', performedBy: bannedBy, targetUser: targetId, metadata: { reason }, ...meta });
}

export async function unbanUser(
  targetId: string,
  unbannedBy: string,
  meta: { ip?: string; browser?: string; device?: string }
): Promise<void> {
  await User.findByIdAndUpdate(targetId, { isBanned: false, $unset: { bannedAt: '', bannedBy: '', banReason: '' } });
  await logActivity({ action: 'USER_UNBANNED', performedBy: unbannedBy, targetUser: targetId, ...meta });
}

export async function forceLogout(
  targetId: string,
  performedBy: string,
  meta: { ip?: string; browser?: string; device?: string }
): Promise<void> {
  const user = await User.findById(targetId);
  if (!user) throw new Error('User not found');
  if (user.role === 'SUPER_ADMIN') throw new Error('Cannot force logout SUPER_ADMIN');

  await User.findByIdAndUpdate(targetId, { $inc: { sessionVersion: 1 } });
  const { revokeAllUserTokens } = await import('./tokenService');
  await revokeAllUserTokens(targetId);
  await logActivity({ action: 'FORCE_LOGOUT', performedBy, targetUser: targetId, ...meta });
}

export async function resetPassword(
  targetId: string,
  newPassword: string,
  performedBy: string,
  meta: { ip?: string; browser?: string; device?: string }
): Promise<void> {
  const user = await User.findById(targetId);
  if (!user) throw new Error('User not found');
  if (user.role === 'SUPER_ADMIN' && performedBy !== targetId) throw new Error('Cannot reset SUPER_ADMIN password');

  const passwordHash = await hashPassword(newPassword);
  await User.findByIdAndUpdate(targetId, { passwordHash, $inc: { sessionVersion: 1 } });
  const { revokeAllUserTokens } = await import('./tokenService');
  await revokeAllUserTokens(targetId);
  await logActivity({ action: 'PASSWORD_RESET', performedBy, targetUser: targetId, ...meta });
}

export async function getUsers(options: {
  role?: string; isDeleted?: boolean; byAdmin?: string;
  page?: number; limit?: number; search?: string;
}): Promise<{ users: IUser[]; total: number; page: number; pages: number }> {
  const { role, isDeleted = false, byAdmin, page = 1, limit = 20, search } = options;
  const filter: Record<string, unknown> = {};

  if (byAdmin) filter.parentAdmin = byAdmin;
  if (role) filter.role = role;

  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const queryOptions = isDeleted ? { bypassSoftDelete: true } as object : {};
  if (isDeleted) filter.isDeleted = true;

  const [users, total] = await Promise.all([
    User.find(filter, null, queryOptions)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter, queryOptions),
  ]);

  return { users: users as IUser[], total, page, pages: Math.ceil(total / limit) };
}
