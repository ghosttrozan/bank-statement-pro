import { Request, Response } from 'express';
import { getSuperAdminDashboard, getAdminDashboard } from '../services/analyticsService';
import Analytics from '../models/Analytics';
import StatementLog from '../models/StatementLog';
import User from '../models/User';

// ── GET /api/analytics/super-dashboard (SUPER_ADMIN only) ──
export const getSuperAdminDashboardData = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await getSuperAdminDashboard();
    res.json(data);
  } catch (error: any) {
    console.error('[AnalyticsController] getSuperAdminDashboardData error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/analytics/admin-dashboard (ADMIN only) ──
export const getAdminDashboardData = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const data = await getAdminDashboard(req.user._id.toString());
    res.json(data);
  } catch (error: any) {
    console.error('[AnalyticsController] getAdminDashboardData error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/analytics/user/:id (SUPER_ADMIN, ADMIN-own) ──
export const getUserAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const analytics = await Analytics.findOne({ userId: req.params.id }).populate('userId', 'fullName username role');
    if (!analytics) {
      res.status(404).json({ message: 'Analytics not found for this user' });
      return;
    }
    res.json(analytics);
  } catch (error: any) {
    console.error('[AnalyticsController] getUserAnalytics error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/analytics/charts/statements-per-day (SUPER_ADMIN only) ──
export const getStatementsPerDay = async (req: Request, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const data = await StatementLog.aggregate([
      { $match: { generatedAt: { $gte: thirtyDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$generatedAt' } },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);

    res.json(data);
  } catch (error: any) {
    console.error('[AnalyticsController] getStatementsPerDay error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/analytics/charts/statements-per-month (SUPER_ADMIN only) ──
export const getStatementsPerMonth = async (req: Request, res: Response): Promise<void> => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const data = await StatementLog.aggregate([
      { $match: { generatedAt: { $gte: twelveMonthsAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$generatedAt' } },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);

    res.json(data);
  } catch (error: any) {
    console.error('[AnalyticsController] getStatementsPerMonth error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/analytics/charts/user-growth (SUPER_ADMIN only) ──
export const getUserGrowth = async (req: Request, res: Response): Promise<void> => {
  try {
    const registrations = await User.aggregate([
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      }},
      { $sort: { _id: 1 } },
    ]);

    // Format to cumulative user registrations
    let cumulative = 0;
    const data = registrations.map((r) => {
      cumulative += r.count;
      return {
        date: r._id,
        newUsers: r.count,
        totalUsers: cumulative,
      };
    });

    res.json(data);
  } catch (error: any) {
    console.error('[AnalyticsController] getUserGrowth error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/analytics/charts/top-generators (SUPER_ADMIN only) ──
export const getTopGeneratorsList = async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await User.find({ isDeleted: false })
      .sort({ totalStatementsGenerated: -1 })
      .limit(10)
      .select('fullName username role totalStatementsGenerated subscription')
      .lean();

    res.json(data);
  } catch (error: any) {
    console.error('[AnalyticsController] getTopGeneratorsList error:', error);
    res.status(500).json({ message: error.message });
  }
};

// ── GET /api/analytics/overview (SUPER_ADMIN and ADMIN only) ──
export const getDashboardOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (req.user.role === 'SUPER_ADMIN') {
      const data = await getSuperAdminDashboard();
      res.json(data);
    } else if (req.user.role === 'ADMIN') {
      const data = await getAdminDashboard(req.user._id.toString());
      res.json(data);
    } else {
      res.status(403).json({ message: 'Access denied: Insufficient permissions' });
    }
  } catch (error: any) {
    console.error('[AnalyticsController] getDashboardOverview error:', error);
    res.status(500).json({ message: error.message });
  }
};
