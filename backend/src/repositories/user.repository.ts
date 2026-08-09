import { UserModel } from '../models/User';
import { BaseRepository } from './base.repository';
import { IUser } from '../../shared/types';

export class UserRepository extends BaseRepository<any> {
  constructor() {
    super(UserModel);
  }

  async findByEmail(email: string): Promise<any | null> {
    return this.findOne({ email: new RegExp(`^${email}$`, 'i') });
  }

  async findByPhone(phone: string): Promise<any | null> {
    return this.findOne({ phone });
  }

  async findByGoogleId(googleId: string): Promise<any | null> {
    return this.findOne({ googleId });
  }

  async findByCredentials(email: string): Promise<any | null> {
    return this.model.findOne({ email: new RegExp(`^${email}$`, 'i') }).select('+password').exec();
  }

  async findByIdWithPassword(id: string): Promise<any | null> {
    return this.model.findById(id).select('+password').exec();
  }

  async findByIdAndPopulate(id: string, populateOptions: string | object = ''): Promise<any | null> {
    return this.model.findById(id).populate(populateOptions as any).exec();
  }

  async findActive(options: any = {}): Promise<IUser[]> {
    return this.findMany({ status: 'active' }, options);
  }

  async listCustomers(options: { page?: number; limit?: number; search?: string; status?: string; sort?: any } = {}): Promise<any> {
    const filter: any = { role: 'customer' };
    // Admin customer list can filter by account status (active/banned).
    if (options.status) {
      filter.status = options.status;
    }
    if (options.search) {
      const regex = new RegExp(options.search, 'i');
      filter.$or = [
        { firstName: { $regex: regex } },
        { lastName: { $regex: regex } },
        { email: { $regex: regex } },
      ];
    }
    return this.paginate(filter, {
      page: options.page,
      limit: options.limit,
      sort: options.sort ?? { createdAt: -1 },
    });
  }

  async findByRole(role: string, options: any = {}): Promise<IUser[]> {
    return this.findMany({ role }, options);
  }

  async incrementLoginCount(userId: string): Promise<IUser | null> {
    return this.findByIdAndUpdate(
      userId,
      { 
        $inc: { loginCount: 1 },
        $set: { lastLoginAt: new Date() }
      },
      { new: true }
    );
  }

  async updateLastLogin(userId: string): Promise<IUser | null> {
    return this.findByIdAndUpdate(
      userId,
      { $set: { lastLoginAt: new Date() }, $inc: { loginCount: 1 } },
      { new: true }
    );
  }

  async registerFailedLogin(userId: string): Promise<IUser | null> {
    return this.findByIdAndUpdate(
      userId,
      { $inc: { failedLoginAttempts: 1 } },
      { new: true }
    );
  }

  async lockAccount(userId: string, until: Date): Promise<IUser | null> {
    return this.findByIdAndUpdate(userId, { $set: { lockedUntil: until } }, { new: true });
  }

  async clearFailedLogins(userId: string): Promise<IUser | null> {
    return this.findByIdAndUpdate(
      userId,
      { $set: { failedLoginAttempts: 0 }, $unset: { lockedUntil: '' } },
      { new: true }
    );
  }

  async isAccountLocked(user: any): Promise<boolean> {
    return Boolean(user?.lockedUntil && new Date(user.lockedUntil) > new Date());
  }

  async updatePassword(userId: string, password: string): Promise<IUser | null> {
    const user = await this.model.findById(userId).select('+password');
    if (!user) return null;
    user.password = password;
    await user.save();
    return user;
  }

  async verifyEmail(userId: string): Promise<IUser | null> {
    return this.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          emailVerified: true,
          emailVerificationToken: undefined,
          emailVerificationExpires: undefined
        } 
      },
      { new: true }
    );
  }

  async setPasswordResetToken(userId: string, token: string, expires: Date): Promise<IUser | null> {
    return this.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          passwordResetToken: token,
          passwordResetExpires: expires
        } 
      },
      { new: true }
    );
  }

  async setEmailVerificationToken(userId: string, token: string, expires: Date): Promise<IUser | null> {
    return this.findByIdAndUpdate(userId, {
      $set: { emailVerificationToken: token, emailVerificationExpires: expires }
    }, { new: true });
  }

  async clearPasswordResetToken(userId: string): Promise<IUser | null> {
    return this.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          passwordResetToken: undefined,
          passwordResetExpires: undefined
        } 
      },
      { new: true }
    );
  }

  async findByResetToken(token: string): Promise<any | null> {
    return this.model.findOne({ passwordResetToken: token, passwordResetExpires: { $gt: new Date() } }).select('+passwordResetToken').exec();
  }

  async findByEmailVerificationToken(token: string): Promise<any | null> {
    return this.model.findOne({ emailVerificationToken: token, emailVerificationExpires: { $gt: new Date() } }).select('+emailVerificationToken').exec();
  }

  async getUserStats(): Promise<any> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]).exec();
  }

  async getRegistrationStats(days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.model.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
      }
    ]).exec();
  }

  async addAddress(userId: string, address: any): Promise<IUser | null> {
    return this.findByIdAndUpdate(userId, { $push: { addresses: address } }, { new: true, runValidators: true });
  }

  async updateAddress(userId: string, addressId: string, address: any): Promise<IUser | null> {
    return this.findOneAndUpdate(
      { _id: userId, 'addresses.id': addressId },
      { $set: Object.fromEntries(Object.entries(address).map(([key, value]) => [`addresses.$.${key}`, value])) },
      { new: true, runValidators: true }
    );
  }

  async removeAddress(userId: string, addressId: string): Promise<IUser | null> {
    return this.findByIdAndUpdate(userId, { $pull: { addresses: { id: addressId } } }, { new: true });
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<IUser | null> {
    const user = await this.model.findOne({ _id: userId, 'addresses.id': addressId });
    if (!user) return null;
    user.addresses.forEach((address: any) => { address.isDefault = address.id === addressId; });
    await user.save();
    return user;
  }

  async updatePreferences(userId: string, preferences: Record<string, boolean>): Promise<IUser | null> {
    return this.findByIdAndUpdate(userId, { $set: { preferences } }, { new: true, runValidators: true });
  }
}
