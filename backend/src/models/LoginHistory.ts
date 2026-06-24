import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ILoginHistory extends Document {
  userId: mongoose.Types.ObjectId;
  ipAddress?: string;
  browser?: string;
  browserVersion?: string;
  operatingSystem?: string;
  operatingSystemVersion?: string;
  deviceType?: string;
  userAgent?: string;
  city?: string;
  state?: string;
  country?: string;
  loginTime: Date;
}

const loginHistorySchema = new Schema<ILoginHistory>(
  {
    userId:                 { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ipAddress:              { type: String },
    browser:                { type: String },
    browserVersion:         { type: String },
    operatingSystem:        { type: String },
    operatingSystemVersion: { type: String },
    deviceType:             { type: String },
    userAgent:              { type: String },
    city:                   { type: String },
    state:                  { type: String },
    country:                { type: String },
    loginTime:              { type: Date, default: Date.now },
  },
  { timestamps: false }
);

loginHistorySchema.index({ userId: 1, loginTime: -1 });
loginHistorySchema.index({ loginTime: -1 });

const LoginHistory: Model<ILoginHistory> = mongoose.model<ILoginHistory>('LoginHistory', loginHistorySchema);
export default LoginHistory;
