import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IAnalytics extends Document {
  userId: mongoose.Types.ObjectId;
  totalGenerated: number;
  todayGenerated: number;
  weeklyGenerated: number;
  thisMonthGenerated: number;
  lastGeneratedAt?: Date;
  lastDailyReset: string;
  lastWeeklyReset: string;
  lastMonthlyReset: string;
}

const analyticsSchema = new Schema<IAnalytics>(
  {
    userId:             { type: Schema.Types.ObjectId, ref: 'User', required: true, },
    totalGenerated:     { type: Number, default: 0 },
    todayGenerated:     { type: Number, default: 0 },
    weeklyGenerated:    { type: Number, default: 0 },
    thisMonthGenerated: { type: Number, default: 0 },
    lastGeneratedAt:    { type: Date },
    lastDailyReset:     { type: String, default: '' },
    lastWeeklyReset:    { type: String, default: '' },
    lastMonthlyReset:   { type: String, default: '' },
  },
  { timestamps: false }
);

analyticsSchema.index({ userId: 1 });

const Analytics: Model<IAnalytics> = mongoose.model<IAnalytics>('Analytics', analyticsSchema);
export default Analytics;
