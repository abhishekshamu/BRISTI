import bcrypt from 'bcryptjs';
import { AdminRepository } from '../repositories/admin.repository';
import { JwtService } from './jwt.service';
import { EmailService } from './email.service';
import { IAdmin } from 'shared/types';
import { BadRequestException, UnauthorizedError, NotFoundException } from '../utils/exceptions';
import { ROLE_PERMISSIONS } from 'shared/constants';

export class AdminService {
  constructor(
    private adminRepo: AdminRepository,
    private jwtService: JwtService,
    private emailService: EmailService
  ) {}

  async register(data: Partial<IAdmin>): Promise<{ admin: IAdmin; accessToken: string; refreshToken: string }> {
    const existingAdmin = await this.adminRepo.findByEmail(data.email!);
    if (existingAdmin) {
      throw new BadRequestException('Admin with this email already exists');
    }

    const permissions = this.getDefaultPermissions(data.role || 'admin');

    const admin = await this.adminRepo.create({
      ...data,
      permissions,
      isActive: true
    });

    const accessToken = this.jwtService.generateAccessToken(admin as any);
    const refreshToken = this.jwtService.generateRefreshToken(admin as any);

    return { admin: admin.toObject(), accessToken, refreshToken };
  }

  async login(email: string, password: string): Promise<{ admin: IAdmin; accessToken: string; refreshToken: string }> {
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      throw new UnauthorizedError('Invalid credentials');
    }

    const admin = await this.adminRepo.findByEmail(email);
    if (!admin) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!admin.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    await this.adminRepo.updateLastLogin(admin._id.toString());

    const accessToken = this.jwtService.generateAccessToken(admin as any);
    const refreshToken = this.jwtService.generateRefreshToken(admin as any);

    return { admin: admin.toObject(), accessToken, refreshToken };
  }

  async getAllAdmins(options: any = {}): Promise<any> {
    const filter: any = { isActive: true };
    return this.adminRepo.paginate(filter, options);
  }

  async getAdminById(id: string): Promise<IAdmin> {
    const admin = await this.adminRepo.findById(id);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    return admin.toObject();
  }

  async updateAdmin(id: string, updateData: Partial<IAdmin>): Promise<IAdmin> {
    const admin = await this.adminRepo.findById(id);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }

    const updated = await this.adminRepo.updateById(id, updateData);
    if (!updated) {
      throw new NotFoundException('Admin not found');
    }
    return updated.toObject();
  }

  async deleteAdmin(id: string): Promise<boolean> {
    const admin = await this.adminRepo.findById(id);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }
    return this.adminRepo.deleteById(id);
  }

  async createAdmin(data: Partial<IAdmin>): Promise<IAdmin> {
    const existingAdmin = await this.adminRepo.findByEmail(data.email!);
    if (existingAdmin) {
      throw new BadRequestException('Admin with this email already exists');
    }

    const permissions = this.getDefaultPermissions(data.role || 'admin');

    const admin = await this.adminRepo.create({
      ...data,
      password: data.password || 'changeme123',
      permissions: data.permissions || permissions,
      isActive: data.isActive !== false
    });

    return admin.toObject();
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const admin = await this.adminRepo.findById(id);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const isValidPassword = await admin.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new BadRequestException('Current password is incorrect');
    }

    await this.adminRepo.updatePassword(id, newPassword);
    return { message: 'Password changed successfully' };
  }

  async updateLastLogin(adminId: string): Promise<IAdmin | null> {
    return this.adminRepo.updateById(adminId, { lastLoginAt: new Date() });
  }

  private getDefaultPermissions(role: string): string[] {
    if (role === 'super_admin') return ROLE_PERMISSIONS.SUPER_ADMIN;
    if (role === 'admin') return ROLE_PERMISSIONS.ADMIN;
    if (role === 'moderator') return ROLE_PERMISSIONS.MODERATOR;
    if (role === 'content_editor') return ROLE_PERMISSIONS.CONTENT_EDITOR;
    if (role === 'support') return ROLE_PERMISSIONS.SUPPORT;
    return [];
  }
}

