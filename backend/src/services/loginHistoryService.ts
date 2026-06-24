import LoginHistory from '../models/LoginHistory';
import { ParsedDevice, GeoLocation } from './geoService';

export async function recordLogin(
  userId: string,
  device: ParsedDevice,
  geo: GeoLocation,
  ip: string
): Promise<void> {
  try {
    await LoginHistory.create({
      userId,
      ipAddress: ip,
      browser: device.browser,
      browserVersion: device.browserVersion,
      operatingSystem: device.operatingSystem,
      operatingSystemVersion: device.operatingSystemVersion,
      deviceType: device.deviceType,
      userAgent: device.userAgent,
      city: geo.city,
      state: geo.state,
      country: geo.country,
      loginTime: new Date(),
    });
  } catch (err) {
    console.error('[LoginHistory] Failed to record login:', err);
  }
}

export async function getLoginHistory(options: {
  userId?: string;
  page?: number;
  limit?: number;
}) {
  const { userId, page = 1, limit = 20 } = options;
  const filter: Record<string, unknown> = {};
  if (userId) filter.userId = userId;

  const [records, total] = await Promise.all([
    LoginHistory.find(filter)
      .populate('userId', 'fullName username role')
      .sort({ loginTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    LoginHistory.countDocuments(filter),
  ]);

  return { records, total, page, limit, pages: Math.ceil(total / limit) };
}
