import Analytics from '../models/Analytics';
import StatementLog from '../models/StatementLog';
import User from '../models/User';

function getTodayStr() { return new Date().toISOString().slice(0, 10); }
function getMonthStr() { return new Date().toISOString().slice(0, 7); }
function getWeekStr() {
  const d = new Date();
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export async function incrementStatementCount(
  userId: string,
  role: string,
  ip?: string,
  deviceType?: string,
  sessionVersion = 0
): Promise<void> {
  const today = getTodayStr();
  const week  = getWeekStr();
  const month = getMonthStr();

  // Upsert analytics document
  let analytics = await Analytics.findOne({ userId });
  if (!analytics) {
    analytics = await Analytics.create({
      userId,
      totalGenerated: 0, todayGenerated: 0, weeklyGenerated: 0,
      thisMonthGenerated: 0,
      lastDailyReset: today, lastWeeklyReset: week, lastMonthlyReset: month,
    });
  }

  // Reset stale period counters
  if (analytics.lastDailyReset !== today)   { analytics.todayGenerated = 0;  analytics.lastDailyReset = today; }
  if (analytics.lastWeeklyReset !== week)    { analytics.weeklyGenerated = 0; analytics.lastWeeklyReset = week; }
  if (analytics.lastMonthlyReset !== month)  { analytics.thisMonthGenerated = 0; analytics.lastMonthlyReset = month; }

  analytics.totalGenerated     += 1;
  analytics.todayGenerated     += 1;
  analytics.weeklyGenerated    += 1;
  analytics.thisMonthGenerated += 1;
  analytics.lastGeneratedAt    = new Date();
  await analytics.save();

  // Increment denormalized counter on User
  await User.findByIdAndUpdate(userId, {
    $inc: { totalStatementsGenerated: 1 },
    $set: { lastGeneratedAt: new Date() },
  });

  // Write append-only statement log
  await StatementLog.create({ userId, role, generatedAt: new Date(), ipAddress: ip, deviceType, sessionVersion });
}

export async function getSuperAdminDashboard() {
  const now = new Date();
  const fiveMinAgo   = new Date(now.getTime() - 5 * 60 * 1000);
  const thirtyDayAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers, totalAdmins, activeUsers, onlineUsers, bannedUsers,
    deletedUsers, analyticsAgg, recentLogins, topGenerators, chartData,
  ] = await Promise.all([
    User.countDocuments({ role: 'USER' }),
    User.countDocuments({ role: 'ADMIN' }),
    User.countDocuments({ isBanned: false }),
    User.countDocuments({ lastSeenAt: { $gte: fiveMinAgo } }),
    User.countDocuments({ isBanned: true }),
    User.countDocuments({ isDeleted: true }, { bypassSoftDelete: true } as object),

    Analytics.aggregate([
      { $group: {
        _id: null,
        totalStatements:   { $sum: '$totalGenerated' },
        todayStatements:   { $sum: '$todayGenerated' },
        weeklyStatements:  { $sum: '$weeklyGenerated' },
        monthlyStatements: { $sum: '$thisMonthGenerated' },
      }},
    ]),

    // Latest 10 logins
    (await import('../models/LoginHistory')).default.find()
      .populate('userId', 'fullName username role')
      .sort({ loginTime: -1 }).limit(10).lean(),

    // Top 10 generators
    User.find({ isDeleted: false })
      .sort({ totalStatementsGenerated: -1 })
      .limit(10)
      .select('fullName username role totalStatementsGenerated lastGeneratedAt subscription')
      .lean(),

    // Statements per day — last 30 days
    StatementLog.aggregate([
      { $match: { generatedAt: { $gte: thirtyDayAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$generatedAt' } },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]),
  ]);

  const agg = analyticsAgg[0] || { totalStatements: 0, todayStatements: 0, weeklyStatements: 0, monthlyStatements: 0 };

  return {
    cards: {
      totalUsers, totalAdmins,
      activeUsers,
      onlineUsers,
      offlineUsers: (totalUsers + totalAdmins) - onlineUsers,
      bannedUsers, deletedUsers,
      totalStatements:   agg.totalStatements,
      todayStatements:   agg.todayStatements,
      weeklyStatements:  agg.weeklyStatements,
      monthlyStatements: agg.monthlyStatements,
    },
    recentLogins,
    topGenerators,
    chartData: {
      statementsPerDay: chartData,
      activeUsersLast30Days: await User.countDocuments({ lastSeenAt: { $gte: thirtyDayAgo } }),
    },
  };
}

export async function getAdminDashboard(adminId: string) {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  const [myUsers, onlineUsers, analyticsAgg] = await Promise.all([
    User.find({ parentAdmin: adminId }).lean(),
    User.countDocuments({ parentAdmin: adminId, lastSeenAt: { $gte: fiveMinAgo } }),
    Analytics.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      { $match: { 'user.parentAdmin': new (await import('mongoose')).default.Types.ObjectId(adminId) } },
      { $group: {
        _id: null,
        totalStatements:   { $sum: '$totalGenerated' },
        todayStatements:   { $sum: '$todayGenerated' },
        monthlyStatements: { $sum: '$thisMonthGenerated' },
      }},
    ]),
  ]);

  const agg = analyticsAgg[0] || { totalStatements: 0, todayStatements: 0, monthlyStatements: 0 };

  return {
    cards: {
      myUsersTotal: myUsers.length,
      activeUsers: myUsers.filter(u => !u.isBanned).length,
      onlineUsers,
      totalStatements:   agg.totalStatements,
      todayStatements:   agg.todayStatements,
      monthlyStatements: agg.monthlyStatements,
    },
    myUsers,
  };
}
