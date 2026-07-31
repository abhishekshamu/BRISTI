import { UserRepository } from '../repositories/user.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { JwtService } from '../services/jwt.service';
import { EmailService } from '../services/email.service';
import { NotificationService } from './notification.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { notifyAdmins } from './admin-notifier';
import { IUser, IAuthToken } from 'shared/types';
import { BadRequestException, UnauthorizedError, NotFoundException } from '../utils/exceptions';
import { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';

export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private authRepo: AuthRepository,
    private jwtService: JwtService,
    private emailService: EmailService
  ) {}

  async register(userData: Partial<IUser>): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const existingUser = await this.userRepo.findByEmail(userData.email!);
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    const user = await this.userRepo.create({
      ...userData,
      role: 'customer',
      status: 'active'
    });

    const accessToken = this.jwtService.generateAccessToken(user);
    const refreshToken = this.jwtService.generateRefreshToken(user);

    const refreshExpiry = this.getRefreshExpiry();
    await this.authRepo.createRefreshToken(user._id.toString(), refreshToken, refreshExpiry);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    await this.userRepo.setEmailVerificationToken(
      user._id.toString(),
      crypto.createHash('sha256').update(verificationToken).digest('hex'),
      new Date(Date.now() + 24 * 60 * 60 * 1000)
    );
    await this.emailService.sendEmailVerificationEmail(user.email!, verificationToken);

    // Notify admins of a new customer registration
    await this.notifyNewCustomer(user);

    return { user: user.toObject(), accessToken, refreshToken };
  }

  private async notifyNewCustomer(user: any): Promise<void> {
    try {
      await notifyAdmins(new NotificationService(new NotificationRepository()), {
        title: 'New Customer Registration',
        message: `A new customer (${user.email}) has registered on the store.`,
        type: 'info',
        relatedId: user._id,
        relatedType: 'User',
      });
    } catch (err) {
      console.error('New customer notification failed:', err);
    }
  }

  async login(email: string, password: string): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      throw new BadRequestException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new BadRequestException('Account is not active');
    }

    await this.userRepo.updateLastLogin(user._id.toString());

    const accessToken = this.jwtService.generateAccessToken(user);
    const refreshToken = this.jwtService.generateRefreshToken(user);

    const refreshExpiry = this.getRefreshExpiry();
    await this.authRepo.createRefreshToken(user._id.toString(), refreshToken, refreshExpiry);

    return { user: user.toObject(), accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; user: IUser }> {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const storedToken = await this.authRepo.findRefreshToken(refreshToken);
    if (!storedToken) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await this.userRepo.findById(payload.id);
    if (!user) {
      throw new UnauthorizedError('Invalid refresh token');
    }
    await this.authRepo.deleteRefreshToken(refreshToken);
    const accessToken = this.jwtService.generateAccessToken(user);
    const nextRefreshToken = this.jwtService.generateRefreshToken(user);
    await this.authRepo.createRefreshToken(user._id.toString(), nextRefreshToken, this.getRefreshExpiry());
    return { accessToken, refreshToken: nextRefreshToken, user: user.toObject() };
  }

  async logout(userId: string, refreshToken: string): Promise<{ message: string }> {
    if (refreshToken) {
      await this.authRepo.deleteRefreshToken(refreshToken);
    }
    await this.authRepo.deleteUserTokens(userId);
    return { message: 'Logged out successfully' };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      return { message: 'If your email is registered, you will receive a password reset link' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    await this.userRepo.setPasswordResetToken(
      user._id.toString(),
      crypto.createHash('sha256').update(resetToken).digest('hex'),
      new Date(Date.now() + 60 * 60 * 1000)
    );

    await this.emailService.sendPasswordResetEmail(user.email!, resetToken);

    return { message: 'If your email is registered, you will receive a password reset link' };
  }

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const user = await this.userRepo.findByResetToken(crypto.createHash('sha256').update(token).digest('hex'));
    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.userRepo.updatePassword(user._id.toString(), password);
    await this.userRepo.clearPasswordResetToken(user._id.toString());

    return { message: 'Password has been reset successfully' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.userRepo.findByEmailVerificationToken(crypto.createHash('sha256').update(token).digest('hex'));
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.userRepo.verifyEmail(user._id.toString());
    return { message: 'Email verified successfully' };
  }

  async getMe(userId: string): Promise<IUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user.toObject();
  }

  async updateProfile(userId: string, updateData: Partial<IUser>): Promise<IUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.userRepo.findByEmail(updateData.email);
      if (existingUser) {
        throw new BadRequestException('Email is already in use');
      }
    }

    const updatedUser = await this.userRepo.updateById(userId, updateData);
    return updatedUser.toObject();
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new BadRequestException('Current password is incorrect');
    }

    await this.userRepo.updatePassword(userId, newPassword);
    await this.authRepo.deleteUserTokens(userId);
    return { message: 'Password changed successfully' };
  }

  private getRefreshExpiry(): Date {
    const configuredDays = Number.parseInt(process.env.JWT_REFRESH_TOKEN_DAYS || '60', 10);
    const days = Number.isFinite(configuredDays) && configuredDays > 0 ? configuredDays : 60;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}

