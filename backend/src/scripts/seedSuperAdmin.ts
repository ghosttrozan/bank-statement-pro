import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db';
import User from '../models/User';
import Analytics from '../models/Analytics';
import { hashPassword } from '../services/userService';

async function seed() {
  console.log('[Seed] Starting database seeding...');
  await connectDB();

  try {
    // Check if a SUPER_ADMIN already exists (bypass soft delete to see if any deactivated exists)
    const existing = await User.findOne({ role: 'SUPER_ADMIN' }).setOptions({ bypassSoftDelete: true });
    if (existing) {
      console.log(`[Seed] SUPER_ADMIN already exists in the database: "${existing.username}"`);
      process.exit(0);
    }

    const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';
    const username = (process.env.SUPER_ADMIN_USERNAME || 'superadmin').toLowerCase();
    const phone = process.env.SUPER_ADMIN_PHONE || '9999999999';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin@12345';

    console.log('[Seed] Creating first SUPER_ADMIN account...');
    console.log(`[Seed] Name: ${name}`);
    console.log(`[Seed] Username: ${username}`);
    console.log(`[Seed] Phone: ${phone}`);

    const passwordHash = await hashPassword(password);
    const superAdmin = await User.create({
      fullName: name,
      username,
      phoneNumber: phone,
      passwordHash,
      role: 'SUPER_ADMIN',
      sessionVersion: 0,
      subscription: {
        plan: 'ENTERPRISE',
        status: 'ACTIVE',
        maxStatements: -1, // Unlimited
      },
    });

    // Create corresponding analytics record
    await Analytics.create({ userId: superAdmin._id });

    console.log('[Seed] SUPER_ADMIN created successfully!');
    console.log(`[Seed] Temporary password is: ${password}`);
    console.log('[Seed] PLEASE CHANGE THIS PASSWORD IMMEDIATELY AFTER LOGGING IN!');
  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('[Seed] Disconnected from database.');
    process.exit(0);
  }
}

seed();
