import mongoose, { Document, Schema, Model } from 'mongoose';

export type ActivityAction =
  | 'LOGIN' | 'LOGOUT'
  | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DELETED' | 'USER_RESTORED'
  | 'USER_BANNED' | 'USER_UNBANNED'
  | 'ADMIN_CREATED' | 'ADMIN_UPDATED' | 'ADMIN_DELETED'
  | 'PASSWORD_CHANGED' | 'PASSWORD_RESET'
  | 'FORCE_LOGOUT'
  | 'STATEMENT_GENERATED'
  | 'SETTINGS_UPDATED'
  | 'IMPERSONATION_STARTED' | 'IMPERSONATION_ENDED'
  | 'BULK_BAN' | 'BULK_DELETE' | 'BULK_FORCE_LOGOUT'
  | 'EXPORT_USERS' | 'EXPORT_LOGIN_HISTORY' | 'EXPORT_ACTIVITY_LOGS';

export interface IActivityLog extends Document {
  action: ActivityAction;
  performedBy: mongoose.Types.ObjectId;
  targetUser?: mongoose.Types.ObjectId;
  ipAddress?: string;
  browser?: string;
  device?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    action:      { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetUser:  { type: Schema.Types.ObjectId, ref: 'User' },
    ipAddress:   { type: String },
    browser:     { type: String },
    device:      { type: String },
    timestamp:   { type: Date, default: Date.now },
    metadata:    { type: Schema.Types.Mixed },
  },
  { timestamps: false }
);

activityLogSchema.index({ performedBy: 1, timestamp: -1 });
activityLogSchema.index({ targetUser: 1, timestamp: -1 });
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });

const ActivityLog: Model<IActivityLog> = mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
export default ActivityLog;
