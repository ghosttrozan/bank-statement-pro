import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISettings extends Document {
  applicationName: string;
  logoUrl?: string;
  dailyStatementLimit: number;
  maintenanceMode: boolean;
  allowedOrigins: string[];
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const settingsSchema = new Schema<ISettings>(
  {
    applicationName:     { type: String, default: 'StatementPro' },
    logoUrl:             { type: String },
    dailyStatementLimit: { type: Number, default: 100 },
    maintenanceMode:     { type: Boolean, default: false },
    allowedOrigins:      { type: [String], default: ['http://localhost:3000'] },
    updatedBy:           { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

const Settings: Model<ISettings> = mongoose.model<ISettings>('Settings', settingsSchema);
export default Settings;
