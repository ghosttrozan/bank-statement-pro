import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IStatementLog extends Document {
  userId: mongoose.Types.ObjectId;
  role: string;
  generatedAt: Date;
  ipAddress?: string;
  deviceType?: string;
  sessionVersion: number;
}

const statementLogSchema = new Schema<IStatementLog>(
  {
    userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
    role:           { type: String, required: true },
    generatedAt:    { type: Date, default: Date.now },
    ipAddress:      { type: String },
    deviceType:     { type: String },
    sessionVersion: { type: Number, default: 0 },
  },
  { timestamps: false }
);

statementLogSchema.index({ userId: 1, generatedAt: -1 });
statementLogSchema.index({ generatedAt: -1 });

const StatementLog: Model<IStatementLog> = mongoose.model<IStatementLog>('StatementLog', statementLogSchema);
export default StatementLog;
