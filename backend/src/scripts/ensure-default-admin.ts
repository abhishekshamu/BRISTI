import mongoose from 'mongoose';
import { AdminModel } from '../models/Admin';
import { ROLE_PERMISSIONS } from '../../shared/constants';
import { getMongoUri, stopMemoryMongo } from '../config/database';

// Development-only fallback credentials. In production the admin must be
// provisioned explicitly via ADMIN_EMAIL / ADMIN_PASSWORD env vars — a known
// default account is never created against a production database.
const DEV_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@bristi.com';
const DEV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

const isProduction = process.env.NODE_ENV === 'production';

export const ensureDefaultAdmin = async (): Promise<void> => {
  try {
    const provisionedEmail = process.env.ADMIN_EMAIL;
    const provisionedPassword = process.env.ADMIN_PASSWORD;

    if (isProduction && (!provisionedEmail || !provisionedPassword)) {
      console.warn('[admin] Skipping default admin creation: set ADMIN_EMAIL and ADMIN_PASSWORD env vars to provision a super-admin in production.');
      return;
    }

    // Never create a default-password admin against a REMOTE database unless
    // an explicit ADMIN_PASSWORD was provided. This protects against a
    // misconfigured local `.env` (NODE_ENV=development + remote MongoDB URI)
    // silently provisioning a known-credential super admin on production data.
    if (!provisionedPassword) {
      const host = (mongoose.connection as any)?.host || '';
      const isRemote = host && !['localhost', '127.0.0.1', '::1'].includes(host) && !host.startsWith('mongodb-memory');
      if (isRemote) {
        console.warn(`[admin] Skipping default admin creation: refusing to create a default-password admin on remote host "${host}". Set ADMIN_EMAIL and ADMIN_PASSWORD to provision explicitly.`);
        return;
      }
    }

    const email = provisionedEmail || DEV_ADMIN_EMAIL;
    const password = provisionedPassword || DEV_ADMIN_PASSWORD;

    const existing = await AdminModel.findOne({ email: email.toLowerCase().trim() }).exec();
    if (existing) {
      return;
    }

    await AdminModel.create({
      email: email.toLowerCase().trim(),
      password,
      firstName: 'BRISTI',
      lastName: 'Admin',
      role: 'super_admin',
      permissions: ROLE_PERMISSIONS.SUPER_ADMIN,
      isActive: true,
    });

    console.log(`Default admin created: ${email}${isProduction ? '' : ' (development default password)'}`);
  } catch (error: any) {
    console.error(`Failed to ensure default admin: ${error.message}`);
  }
};

export const runEnsureDefaultAdmin = async (): Promise<void> => {
  const uri = await getMongoUri();
  await mongoose.connect(uri);
  await ensureDefaultAdmin();
  await mongoose.disconnect();
  await stopMemoryMongo();
};

if (require.main === module) {
  runEnsureDefaultAdmin().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}