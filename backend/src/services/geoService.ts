import { UAParser } from 'ua-parser-js';

export interface ParsedDevice {
  browser: string;
  browserVersion: string;
  operatingSystem: string;
  operatingSystemVersion: string;
  deviceType: string;
  userAgent: string;
}

export function parseUserAgent(userAgent: string): ParsedDevice {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  return {
    browser:                result.browser.name || 'Unknown',
    browserVersion:         result.browser.version || '',
    operatingSystem:        result.os.name || 'Unknown',
    operatingSystemVersion: result.os.version || '',
    deviceType:             result.device.type || 'desktop',
    userAgent,
  };
}

export interface GeoLocation {
  city: string;
  state: string;
  country: string;
}

export async function getGeoFromIP(ip: string): Promise<GeoLocation> {
  // Skip for localhost / private IPs
  if (!ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { city: 'Localhost', state: 'Local', country: 'Local' };
  }

  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionName,country,status`);
    const data = await res.json() as { status: string; city: string; regionName: string; country: string };
    if (data.status === 'success') {
      return { city: data.city || '', state: data.regionName || '', country: data.country || '' };
    }
  } catch {
    // Silently fail — geo is non-critical
  }
  return { city: '', state: '', country: '' };
}

export function getClientIP(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ip.trim();
  }
  return req.ip || '';
}
