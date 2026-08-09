import { UserRepository } from '../repositories/user.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { IUser } from '../../shared/types';
import { ValidationError, NotFoundError, BadRequestError } from '../utils/exceptions';
import { randomUUID } from 'crypto';

export class UserService {
  constructor(
    private userRepo: UserRepository,
    private authRepo?: AuthRepository
  ) {}

  async getUserById(userId: string): Promise<IUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user.toObject();
  }

  async getUserByEmail(email: string): Promise<IUser> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return user.toObject();
  }

  async updateUser(userId: string, updateData: Partial<IUser>): Promise<IUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.userRepo.findByEmail(updateData.email);
      if (existingUser) {
        throw new BadRequestError('Email is already in use');
      }
    }

    const updatedUser = await this.userRepo.updateById(userId, updateData);
    return updatedUser.toObject();
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new ValidationError('Current password is incorrect');
    }

    await this.userRepo.updatePassword(userId, newPassword);
    // Revoke all refresh tokens after a password change (all devices).
    if (this.authRepo) {
      await this.authRepo.deleteUserTokens(userId);
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await this.userRepo.updateById(userId, { status: 'deleted' });
    return true;
  }

  async listAddresses(userId: string): Promise<any[]> {
    const user: any = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return user.addresses || [];
  }

  async addAddress(userId: string, address: any): Promise<any[]> {
    const user: any = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    const addresses = user.addresses || [];
    const created = await this.userRepo.addAddress(userId, { ...address, id: randomUUID(), isDefault: addresses.length === 0 || Boolean(address.isDefault) });
    if (address.isDefault && created) return this.setDefaultAddress(userId, created.addresses[created.addresses.length - 1].id);
    return (created as any).addresses;
  }

  async updateAddress(userId: string, addressId: string, address: any): Promise<any[]> {
    const updated: any = await this.userRepo.updateAddress(userId, addressId, address);
    if (!updated) throw new NotFoundError('Address not found');
    if (address.isDefault) return this.setDefaultAddress(userId, addressId);
    return updated.addresses;
  }

  async removeAddress(userId: string, addressId: string): Promise<any[]> {
    const updated: any = await this.userRepo.removeAddress(userId, addressId);
    if (!updated) throw new NotFoundError('User not found');
    return updated.addresses;
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<any[]> {
    const updated: any = await this.userRepo.setDefaultAddress(userId, addressId);
    if (!updated) throw new NotFoundError('Address not found');
    return updated.addresses;
  }

  async updatePreferences(userId: string, preferences: Record<string, boolean>): Promise<any> {
    const user: any = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    const updated: any = await this.userRepo.updatePreferences(userId, { ...user.preferences?.toObject?.(), ...user.preferences, ...preferences });
    return updated.preferences;
  }

  async listCustomers(options: any = {}): Promise<any> {
    return this.userRepo.listCustomers(options);
  }

  async getCustomerById(customerId: string): Promise<any> {
    const customer = await this.userRepo.findById(customerId);
    if (!customer || customer.role !== 'customer') {
      throw new NotFoundError('Customer not found');
    }
    return customer.toObject();
  }

  async updateCustomerStatus(customerId: string, status: string): Promise<any> {
    if (!['active', 'suspended', 'deleted'].includes(status)) {
      throw new ValidationError('Invalid customer status');
    }
    const customer = await this.userRepo.findById(customerId);
    if (!customer || customer.role !== 'customer') {
      throw new NotFoundError('Customer not found');
    }
    const updated = await this.userRepo.updateById(customerId, { status });
    return updated.toObject();
  }
}

