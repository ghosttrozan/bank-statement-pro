import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISubscription {
  plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'SUSPENDED';
  startDate?: Date;
  endDate?: Date;
  maxStatements: number;
}

export interface ILastLocation {
  city?: string;
  state?: string;
  country?: string;
}

export interface ILastDeviceInfo {
  browser?: string;
  browserVersion?: string;
  operatingSystem?: string;
  operatingSystemVersion?: string;
  deviceType?: string;
  userAgent?: string;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  username: string;
  phoneNumber: string;
  passwordHash: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
  createdBy?: mongoose.Types.ObjectId;
  parentAdmin?: mongoose.Types.ObjectId;
  isBanned: boolean;
  bannedAt?: Date;
  bannedBy?: mongoose.Types.ObjectId;
  banReason?: string;
  sessionVersion: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: mongoose.Types.ObjectId;
  subscription: ISubscription;
  totalStatementsGenerated: number;
  lastGeneratedAt?: Date;
  lastSeenAt?: Date;
  lastIPAddress?: string;
  lastLocation?: ILastLocation;
  lastDeviceInfo?: ILastDeviceInfo;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    fullName:     { type: String, required: true, trim: true },
    username:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    phoneNumber:  { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role:         { type: String, enum: ['SUPER_ADMIN', 'ADMIN', 'USER'], default: 'USER' },
    createdBy:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
    parentAdmin:  { type: Schema.Types.ObjectId, ref: 'User', default: null },
    isBanned:     { type: Boolean, default: false },
    bannedAt:     { type: Date },
    bannedBy:     { type: Schema.Types.ObjectId, ref: 'User' },
    banReason:    { type: String },
    sessionVersion: { type: Number, default: 0 },
    isDeleted:    { type: Boolean, default: false },
    deletedAt:    { type: Date },
    deletedBy:    { type: Schema.Types.ObjectId, ref: 'User' },
    subscription: {
      plan:          { type: String, enum: ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'], default: 'FREE' },
      status:        { type: String, enum: ['ACTIVE', 'INACTIVE', 'EXPIRED', 'SUSPENDED'], default: 'ACTIVE' },
      startDate:     { type: Date },
      endDate:       { type: Date },
      maxStatements: { type: Number, default: 50 },
    },
    totalStatementsGenerated: { type: Number, default: 0 },
    lastGeneratedAt:          { type: Date },
    lastSeenAt:               { type: Date },
    lastIPAddress:            { type: String },
    lastLocation: {
      city:    { type: String },
      state:   { type: String },
      country: { type: String },
    },
    lastDeviceInfo: {
      browser:                { type: String },
      browserVersion:         { type: String },
      operatingSystem:        { type: String },
      operatingSystemVersion: { type: String },
      deviceType:             { type: String },
      userAgent:              { type: String },
    },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, isDeleted: 1 });
userSchema.index({ parentAdmin: 1, isDeleted: 1 });
userSchema.index({ lastSeenAt: -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ username: 1 });
userSchema.index({ phoneNumber: 1 });

// Auto soft-delete filter
function autoFilterDeleted(this: mongoose.Query<unknown, IUser>) {
  const opts = this.getOptions() as { bypassSoftDelete?: boolean };
  if (!opts.bypassSoftDelete) {
    this.where({ isDeleted: false });
  }
}
userSchema.pre('find', autoFilterDeleted);
userSchema.pre('findOne', autoFilterDeleted);
userSchema.pre('countDocuments', autoFilterDeleted);

const User: Model<IUser> = mongoose.model<IUser>('User', userSchema);
export default User;
