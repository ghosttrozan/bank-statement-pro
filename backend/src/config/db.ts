import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[DB] MONGODB_URI is not set in environment variables.');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri, { dbName: 'statementpro' });
    console.log('[DB] MongoDB connected successfully.');
  } catch (err) {
    console.error('[DB] Connection failed:', err);
    process.exit(1);
  }
  mongoose.connection.on('disconnected', () => console.warn('[DB] MongoDB disconnected.'));
  mongoose.connection.on('error', (err) => console.error('[DB] MongoDB error:', err));
};

export default connectDB;
