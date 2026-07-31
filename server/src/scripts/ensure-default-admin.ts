import mongoose from 'mongoose';
import { AdminModel } from '../models/Admin';
import { ROLE_PERMISSIONS } from 'shared/constants';
import { getMongoUri, stopMemoryMongo } from '../config/database';

const DEFAULT_ADMIN_EMAIL = 'admin@bristi.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123';

export const ensureDefaultAdmin = async (): Promise<void> => {
  try {
    const existing = await AdminModel.findOne({ email: DEFAULT_ADMIN_EMAIL }).exec();
    if (existing) {
      console.log(`Default admin already exists: ${DEFAULT_ADMIN_EMAIL}`);
      return;
    }

    await AdminModel.create({
      email: DEFAULT_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD,
      firstName: 'BRISTI',
      lastName: 'Admin',
      role: 'super_admin',
      permissions: ROLE_PERMISSIONS.SUPER_ADMIN,
      isActive: true,
    });

    console.log(`Default admin created: ${DEFAULT_ADMIN_EMAIL}`);
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
