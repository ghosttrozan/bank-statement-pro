import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IRefreshToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  sessionVersion: number;
  expiresAt: Date;
  isRevoked: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash:      { type: String, required: true, },
    sessionVersion: { type: Number, required: true },
    expiresAt:      { type: Date, required: true },
    isRevoked:      { type: Boolean, default: false },
    ipAddress:      { type: String },
    userAgent:      { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ tokenHash: 1 });

const RefreshToken: Model<IRefreshToken> = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);
export default RefreshToken;
