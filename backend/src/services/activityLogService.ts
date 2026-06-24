import ActivityLog, { ActivityAction } from '../models/ActivityLog';

interface LogActivityParams {
  action: ActivityAction;
  performedBy: string;
  targetUser?: string;
  ipAddress?: string;
  browser?: string;
  device?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await ActivityLog.create({
      action: params.action,
      performedBy: params.performedBy,
      targetUser: params.targetUser,
      ipAddress: params.ipAddress,
      browser: params.browser,
      device: params.device,
      metadata: params.metadata,
      timestamp: new Date(),
    });
  } catch (err) {
    // Activity logging must never crash the main request
    console.error('[ActivityLog] Failed to write log:', err);
  }
}

export async function getActivityLogs(options: {
  page?: number;
  limit?: number;
  userId?: string;
  action?: ActivityAction;
  startDate?: Date;
  endDate?: Date;
}) {
  const { page = 1, limit = 20, userId, action, startDate, endDate } = options;
  const filter: Record<string, unknown> = {};

  if (userId) {
    filter.$or = [{ performedBy: userId }, { targetUser: userId }];
  }
  if (action) filter.action = action;
  if (startDate || endDate) {
    filter.timestamp = {
      ...(startDate && { $gte: startDate }),
      ...(endDate && { $lte: endDate }),
    };
  }

  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .populate('performedBy', 'fullName username role')
      .populate('targetUser', 'fullName username role')
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ActivityLog.countDocuments(filter),
  ]);

  return { logs, total, page, limit, pages: Math.ceil(total / limit) };
}
