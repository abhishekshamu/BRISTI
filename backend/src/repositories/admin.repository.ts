import { AdminModel } from '../models/Admin';
import { BaseRepository } from './base.repository';
import { IAdmin } from '../../shared/types';
import bcrypt from 'bcryptjs';

export class AdminRepository extends BaseRepository<IAdmin> {
  constructor() {
    super(AdminModel);
  }

  async findByEmail(email: string): Promise<IAdmin | null> {
    if (typeof email !== 'string' || !email.trim()) return null;
    return this.findOne({ email: email.toLowerCase().trim() });
  }

  async findByCredentials(email: string): Promise<IAdmin | null> {
    if (typeof email !== 'string' || !email.trim()) return null;
    return this.model.findOne({ email: email.toLowerCase().trim() }).select('+password').exec();
  }

  async findByIdWithPassword(id: string): Promise<IAdmin | null> {
    return this.model.findById(id).select('+password').exec();
  }

  async updateLastLogin(id: string): Promise<IAdmin | null> {
    return this.findByIdAndUpdate(id, { lastLoginAt: new Date() }, { new: true });
  }

  async updatePassword(id: string, newPassword: string): Promise<IAdmin | null> {
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

