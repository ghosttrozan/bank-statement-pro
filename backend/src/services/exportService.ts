import { createObjectCsvStringifier } from 'csv-writer';
import User from '../models/User';
import LoginHistory from '../models/LoginHistory';
import ActivityLog from '../models/ActivityLog';
import StatementLog from '../models/StatementLog';

export async function exportUsersCSV(): Promise<string> {
  const users = await User.find({}).lean();

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'fullName',     title: 'Full Name' },
      { id: 'username',     title: 'Username' },
      { id: 'phoneNumber',  title: 'Phone Number' },
      { id: 'role',         title: 'Role' },
      { id: 'isBanned',     title: 'Is Banned' },
      { id: 'isDeleted',    title: 'Is Deleted' },
      { id: 'plan',         title: 'Subscription Plan' },
      { id: 'totalStatements', title: 'Total Statements' },
      { id: 'lastSeenAt',   title: 'Last Seen' },
      { id: 'createdAt',    title: 'Created At' },
    ],
  });

  const records = users.map(u => ({
    fullName: u.fullName,
    username: u.username,
    phoneNumber: u.phoneNumber,
    role: u.role,
    isBanned: u.isBanned,
    isDeleted: u.isDeleted,
    plan: u.subscription?.plan || 'FREE',
    totalStatements: u.totalStatementsGenerated,
    lastSeenAt: u.lastSeenAt?.toISOString() || '',
    createdAt: (u as unknown as { createdAt: Date }).createdAt?.toISOString() || '',
  }));

  return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);
}

export async function exportLoginHistoryCSV(): Promise<string> {
  const records = await LoginHistory.find({})
    .populate('userId', 'fullName username')
    .sort({ loginTime: -1 })
    .lean();

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'user',      title: 'User' },
      { id: 'ip',        title: 'IP Address' },
      { id: 'browser',   title: 'Browser' },
      { id: 'os',        title: 'Operating System' },
      { id: 'device',    title: 'Device' },
      { id: 'city',      title: 'City' },
      { id: 'country',   title: 'Country' },
      { id: 'loginTime', title: 'Login Time' },
    ],
  });

  const rows = records.map(r => ({
    user: (r.userId as unknown as { fullName: string })?.fullName || '',
    ip: r.ipAddress || '',
    browser: `${r.browser || ''} ${r.browserVersion || ''}`.trim(),
    os: `${r.operatingSystem || ''} ${r.operatingSystemVersion || ''}`.trim(),
    device: r.deviceType || '',
    city: r.city || '',
    country: r.country || '',
    loginTime: r.loginTime?.toISOString() || '',
  }));

  return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(rows);
}

export async function exportActivityLogsCSV(): Promise<string> {
  const logs = await ActivityLog.find({})
    .populate('performedBy', 'fullName username')
    .populate('targetUser', 'fullName username')
    .sort({ timestamp: -1 })
    .lean();

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'action',      title: 'Action' },
      { id: 'performedBy', title: 'Performed By' },
      { id: 'targetUser',  title: 'Target User' },
      { id: 'ip',          title: 'IP Address' },
      { id: 'timestamp',   title: 'Timestamp' },
      { id: 'metadata',    title: 'Metadata' },
    ],
  });

  const rows = logs.map(l => ({
    action: l.action,
    performedBy: (l.performedBy as unknown as { fullName: string })?.fullName || '',
    targetUser:  (l.targetUser as unknown as { fullName: string })?.fullName || '',
    ip: l.ipAddress || '',
    timestamp: l.timestamp?.toISOString() || '',
    metadata: JSON.stringify(l.metadata || {}),
  }));

  return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(rows);
}

export async function exportStatementLogsCSV(): Promise<string> {
  const logs = await StatementLog.find({})
    .populate('userId', 'fullName username')
    .sort({ generatedAt: -1 })
    .lean();

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'user',        title: 'User' },
      { id: 'role',        title: 'Role' },
      { id: 'ipAddress',   title: 'IP Address' },
      { id: 'deviceType',  title: 'Device Type' },
      { id: 'generatedAt', title: 'Generated At' },
    ],
  });

  const rows = logs.map(l => ({
    user: (l.userId as unknown as { fullName: string })?.fullName || '',
    role: l.role || '',
    ipAddress: l.ipAddress || '',
    deviceType: l.deviceType || '',
    generatedAt: l.generatedAt?.toISOString() || '',
  }));

  return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(rows);
}
