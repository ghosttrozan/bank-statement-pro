import Analytics from '../models/Analytics';
import User from '../models/User';
import { hashPassword } from './userService';

export async function ensureSuperAdmin(): Promise<void> {
  const existing = await User.findOne({ role: 'SUPER_ADMIN' }).setOptions({ bypassSoftDelete: true });
  if (existing) {
    console.log(`[Seed] SUPER_ADMIN already exists in the database: "${existing.username}"`);
    return;
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
      maxStatements: -1,
    },
  });

  await Analytics.create({ userId: superAdmin._id });

  console.log('[Seed] SUPER_ADMIN created successfully!');
  console.log(`[Seed] Temporary password is: ${password}`);
  console.log('[Seed] PLEASE CHANGE THIS PASSWORD IMMEDIATELY AFTER LOGGING IN!');
}
