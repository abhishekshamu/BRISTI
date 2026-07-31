import { AdminModel } from '../models/Admin';
import { BaseRepository } from './base.repository';
import { IAdmin } from 'shared/types';

export class AdminRepository extends BaseRepository<IAdmin> {
  constructor() {
    super(AdminModel);
  }

  async findByEmail(email: string): Promise<IAdmin | null> {
    if (typeof email !== 'string' || !email.trim()) return null;
    return this.findOne({ email: email.toLowerCase().trim() });
  }

  async updateLastLogin(id: string): Promise<IAdmin | null> {
    return this.findByIdAndUpdate(id, { lastLoginAt: new Date() }, { new: true });
  }

  async updatePassword(id: string, newPassword: string): Promise<IAdmin | null> {
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    return this.updateById(id, { password: hashedPassword });
  }

  async findByRole(role: string, options: any = {}): Promise<IAdmin[]> {
    return this.findMany({ role, isActive: true }, options);
  }

  async getAdminStats(): Promise<any> {
    return this.model.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
  }
}

