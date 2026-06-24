import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db';
import { ensureSuperAdmin } from '../services/superAdminService';

async function seed() {
  console.log('[Seed] Starting database seeding...');
  await connectDB();

  try {
    await ensureSuperAdmin();
  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('[Seed] Disconnected from database.');
    process.exit(process.exitCode || 0);
  }
}

seed();
