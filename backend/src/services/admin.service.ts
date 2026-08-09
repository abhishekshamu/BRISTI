import bcrypt from 'bcryptjs';
import { AdminRepository } from '../repositories/admin.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { JwtService } from './jwt.service';
import { IAdmin } from '../../shared/types';
import { BadRequestException, UnauthorizedError, NotFoundException, ForbiddenError } from '../utils/exceptions';
import { ROLE_PERMISSIONS } from '../../shared/constants';

export class AdminService {
  private static readonly ALLOWED_ROLES = ['super_admin', 'admin', 'moderator', 'content_editor', 'support'];

  constructor(
    private adminRepo: AdminRepository,
    private jwtService: JwtService,
    private authRepo?: AuthRepository
  ) {}

  async login(email: string, password: string): Promise<{ admin: IAdmin; accessToken: string; refreshToken: string }> {
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      throw new UnauthorizedError('Invalid credentials');
    }

    const admin = await this.adminRepo.findByCredentials(email) as any;
    if (!admin) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!admin.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    if (admin.isLocked()) {
      throw new UnauthorizedError('Account temporarily locked. Try again later.');
    }

    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      await admin.incrementFailedAttempts();
      throw new UnauthorizedError('Invalid credentials');
    }

    await admin.resetFailedLoginAttempts();
    await this.adminRepo.updateLastLogin(admin._id.toString());

    const accessToken = this.jwtService.generateAccessToken(admin as any);
    const refreshToken = this.jwtService.generateRefreshToken(admin as any);

    // Persist the refresh token so /api/auth/refresh-token works for admins too.
    if (this.authRepo) {
      const refreshDays = Number.parseInt(process.env.JWT_REFRESH_TOKEN_DAYS || '60', 10);
      const days = Number.isFinite(refreshDays) && refreshDays > 0 ? refreshDays : 60;
      await this.authRepo.createRefreshToken(admin._id.toString(), refreshToken, new Date(Date.now() + days * 24 * 60 * 60 * 1000), 'admin');
    }

    const safeAdmin = admin.toObject();
    delete safeAdmin.password;

    return { admin: safeAdmin, accessToken, refreshToken };
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

  async updateAdmin(id: string, updateData: Partial<IAdmin>, requester: { id?: string; role?: string } = {}): Promise<IAdmin> {
    const requesterRole = requester.role || 'admin';
    const requesterId = requester.id;
    const admin = await this.adminRepo.findById(id);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Super admins cannot be modified or demoted by anyone except another super admin.
    if (admin.role === 'super_admin' && requesterRole !== 'super_admin') {
      throw new ForbiddenError('Only a super admin can modify a super admin');
    }
    // Admins may not change their own role (prevents self-escalation/demotion).
    if (requesterId && requesterId === id && updateData.role && updateData.role !== admin.role) {
      throw new ForbiddenError('You cannot change your own role');
    }
    // No one may deactivate themselves.
    if (requesterId && requesterId === id && updateData.isActive === false) {
      throw new ForbiddenError('You cannot deactivate your own account');
    }

    const role = updateData.role || admin.role;
    if (!AdminService.ALLOWED_ROLES.includes(role)) {
      throw new BadRequestException('Invalid admin role');
    }
    if (requesterRole !== 'super_admin' && role === 'super_admin') {
      throw new BadRequestException('Only a super admin can grant the super admin role');
    }
    if (requesterRole !== 'super_admin' && admin.role === 'super_admin') {
      throw new ForbiddenError('Only a super admin can modify a super admin');
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    }
    if (updateData.permissions && requesterRole !== 'super_admin') {
      updateData.permissions = this.getDefaultPermissions(role);
    }

    const updated = await this.adminRepo.updateById(id, updateData);
    if (!updated) {
      throw new NotFoundException('Admin not found');
    }
    return updated.toObject();
  }

  async deleteAdmin(id: string, requester: { id?: string; role?: string } = {}): Promise<boolean> {
    const requesterRole = requester.role || 'admin';
    const requesterId = requester.id;
    const admin = await this.adminRepo.findById(id);
    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // No one may delete their own account; super admins can only be deleted by a super admin.
    if (requesterId && requesterId === id) {
      throw new ForbiddenError('You cannot delete your own account');
    }
    if (admin.role === 'super_admin' && requesterRole !== 'super_admin') {
      throw new ForbiddenError('Only a super admin can delete a super admin');
    }

    // Revoke any stored refresh tokens for the deleted admin.
    if (this.authRepo) {
      await this.authRepo.deleteOwnerTokens(id, 'admin').catch(() => undefined);
    }
    return this.adminRepo.deleteById(id);
  }

  async createAdmin(data: Partial<IAdmin>, requesterRole: string = 'admin'): Promise<IAdmin> {
    const existingAdmin = await this.adminRepo.findByEmail(data.email!);
    if (existingAdmin) {
      throw new BadRequestException('Admin with this email already exists');
    }

    if (!data.email || !data.password || !data.firstName || !data.lastName) {
      throw new BadRequestException('Email, password, first name and last name are required');
    }

    const role = data.role || 'admin';
    if (!AdminService.ALLOWED_ROLES.includes(role)) {
      throw new BadRequestException('Invalid admin role');
    }
    if (requesterRole !== 'super_admin' && role === 'super_admin') {
      throw new BadRequestException('Only a super admin can create a super admin');
    }

    // Client-supplied permissions are ignored unless the requester is a
    // super admin; every other role gets its defaults.
    const permissions = requesterRole === 'super_admin'
      ? data.permissions || this.getDefaultPermissions(role)
      : this.getDefaultPermissions(role);

    const admin = await this.adminRepo.create({
      ...data,
      role,
      permissions,
      isActive: data.isActive !== false
    });

    return admin.toObject();
  }

  async changePassword(id: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const admin = await this.adminRepo.findByIdWithPassword(id) as any;
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

