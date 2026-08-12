import { UserRepository } from '../repositories/user.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { AdminRepository } from '../repositories/admin.repository';
import { SessionRepository } from '../repositories/session.repository';
import { LoginHistoryRepository } from '../repositories/login-history.repository';
import { JwtService } from './jwt.service';
import { EmailService } from './email.service';
import { OtpService } from './otp.service';
import { OtpPurpose } from '../repositories/otp.repository';
import { GoogleService, GoogleProfile } from './google.service';
import { NotificationService } from './notification.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { notifyAdmins } from './admin-notifier';
import { IUser } from '../../shared/types';
import { BadRequestException, UnauthorizedError, NotFoundException } from '../utils/exceptions';
import crypto from 'crypto';

const LOCKOUT_THRESHOLD = 5;            // failed attempts before lockout
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minute lockout window

export interface ClientMeta {
  ip?: string;
  userAgent?: string;
}

export class AuthService {
  constructor(
    private userRepo: UserRepository,
    private authRepo: AuthRepository,
    private jwtService: JwtService,
    private emailService: EmailService,
    private otpService?: OtpService,
    private googleService?: GoogleService,
    private sessionRepo?: SessionRepository,
    private loginHistoryRepo?: LoginHistoryRepository,
    private adminRepo?: AdminRepository
  ) { }

  private async issueTokens(user: any): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = this.jwtService.generateAccessToken(user);
    const refreshToken = this.jwtService.generateRefreshToken(user);
    const refreshExpiry = this.getRefreshExpiry();
    await this.authRepo.createRefreshToken(user._id.toString(), refreshToken, refreshExpiry);
    if (this.sessionRepo) {
      await this.sessionRepo.createSession({
        userId: user._id.toString(),
        tokenHash: SessionRepository.hashToken(refreshToken),
      });
    }
    return { accessToken, refreshToken };
  }

  private async recordLogin(entry: {
    userId?: string;
    method: 'email' | 'google' | 'phone' | 'refresh';
    success: boolean;
    meta?: ClientMeta;
    identifier?: string;
    failedReason?: string;
  }): Promise<void> {
    if (!this.loginHistoryRepo) return;
    await this.loginHistoryRepo.record({
      userId: entry.userId,
      method: entry.method,
      success: entry.success,
      ip: entry.meta?.ip,
      userAgent: entry.meta?.userAgent,
      identifier: entry.identifier,
      failedReason: entry.failedReason,
    });
  }

  private async enforceLockout(user: any, meta?: ClientMeta, identifier?: string): Promise<void> {
    if (await this.userRepo.isAccountLocked(user)) {
      await this.recordLogin({
        userId: user._id?.toString(),
        method: 'email',
        success: false,
        meta,
        identifier,
        failedReason: 'account_locked',
      });
      throw new BadRequestException('Account is temporarily locked due to too many failed attempts. Try again in 15 minutes.');
    }
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  }

  async googleLogin(credential: string, meta?: ClientMeta, authenticatedUserId?: string): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    if (!this.googleService) {
      throw new BadRequestException('Google sign-in is not available');
    }

    let profile: GoogleProfile;
    try {
      profile = await this.googleService.verifyIdToken(credential);
    } catch (_err: any) {
      await this.recordLogin({
        method: 'google',
        success: false,
        meta,
        failedReason: 'token_verification_failed',
      });
      throw new BadRequestException('Google authentication failed. Please try again.');
    }

    let user = await this.userRepo.findByGoogleId(profile.sub);

    if (authenticatedUserId) {
      // Account linking: an authenticated customer is connecting a Google
      // identity to their existing BRISTI account.
      if (user && user._id.toString() !== authenticatedUserId) {
        await this.recordLogin({
          userId: user._id.toString(),
          method: 'google',
          success: false,
          meta,
          identifier: profile.email,
          failedReason: 'google_id_linked_elsewhere',
        });
        throw new BadRequestException('This Google account is already linked to another BRISTI account');
      }
      if (!user) {
        // The Google identity must not hijack another account's verified email.
        if (profile.email && profile.emailVerified) {
          const emailUser = await this.userRepo.findByEmail(profile.email);
          if (emailUser && emailUser._id.toString() !== authenticatedUserId) {
            throw new BadRequestException('This Google email is linked to another BRISTI account');
          }
        }
        user = await this.userRepo.findById(authenticatedUserId);
        if (!user) {
          throw new BadRequestException('Account not found');
        }
        const patch: Record<string, unknown> = { googleId: profile.sub };
        if (!user.avatar && profile.picture) patch.avatar = profile.picture;
        if ((!user.firstName || user.firstName === 'BRISTI') && (profile.givenName || profile.name)) {
          patch.firstName = profile.givenName || profile.name.split(' ')[0] || 'BRISTI';
        }
        if (!user.lastName || user.lastName === 'Member') {
          patch.lastName = profile.familyName || profile.name?.split(' ').slice(1).join(' ') || 'Member';
        }
        if (!user.email && profile.email) {
          patch.email = profile.email;
          patch.emailVerified = profile.emailVerified;
        } else if (
          profile.email &&
          profile.emailVerified &&
          user.email &&
          user.email.toLowerCase() === profile.email.toLowerCase()
        ) {
          patch.emailVerified = true;
        }
        user = await this.userRepo.updateById(authenticatedUserId, patch);
      }
    } else if (!user && profile.email) {
      // A verified email on the ID token may be trusted for account linking.
      user = profile.emailVerified ? await this.userRepo.findByEmail(profile.email) : null;
      if (user) {
        await this.userRepo.updateById(user._id.toString(), { googleId: profile.sub });
      }
    }

    if (!user) {
      if (!profile.email) {
        throw new BadRequestException('Your Google account has no email address we can use');
      }
      const existing = await this.userRepo.findByEmail(profile.email);
      if (existing) {
        throw new BadRequestException('An account with this email already exists. Please log in with your email and password.');
      }
      user = await this.userRepo.create({
        email: profile.email,
        emailVerified: profile.emailVerified,
        firstName: profile.givenName || profile.name?.split(' ')[0] || 'Google',
        lastName: profile.familyName || profile.name?.split(' ').slice(1).join(' ') || 'User',
        avatar: profile.picture,
        authProvider: 'google',
        googleId: profile.sub,
        role: 'customer',
        status: 'active',
      });
    }

    if (user.status !== 'active') {
      await this.recordLogin({
        userId: user._id.toString(),
        method: 'google',
        success: false,
        meta,
        identifier: profile.email,
        failedReason: 'account_inactive',
      });
      throw new BadRequestException('Account is not active');
    }

    await this.userRepo.clearFailedLogins(user._id.toString());
    await this.userRepo.updateLastLogin(user._id.toString());
    await this.recordLogin({
      userId: user._id.toString(),
      method: 'google',
      success: true,
      meta,
      identifier: profile.email,
    });

    const { accessToken, refreshToken } = await this.issueTokens(user);
    return { user: user.toObject(), accessToken, refreshToken };
  }

  async requestOtp(phone: string, _meta?: ClientMeta, purpose: OtpPurpose = 'login'): Promise<{ sent: boolean; resendInSeconds: number }> {
    if (!this.otpService) {
      throw new BadRequestException('Phone verification is not available');
    }
    return this.otpService.sendOtp(this.normalizePhone(phone), purpose);
  }

  async verifyOtpAndLogin(
    phone: string,
    otp: string,
    meta?: ClientMeta,
    authenticatedUserId?: string,
    purpose: OtpPurpose = 'login'
  ): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    if (!this.otpService) {
      throw new BadRequestException('Phone verification is not available');
    }

    const normalizedPhone = this.normalizePhone(phone);
    try {
      await this.otpService.verifyOtp(normalizedPhone, otp, purpose);
    } catch (error: any) {
      await this.recordLogin({
        method: 'phone',
        success: false,
        meta,
        identifier: normalizedPhone,
        failedReason: error?.message?.toLowerCase().includes('attempt') ? 'max_attempts' : 'wrong_code',
      });
      throw error;
    }

    const byPhone = await this.userRepo.findByPhone(normalizedPhone);
    let user: any;

    if (authenticatedUserId) {
      // Account linking: an authenticated customer verifies a phone number
      // that is not yet on their account.
      if (byPhone && byPhone._id.toString() !== authenticatedUserId) {
        await this.recordLogin({
          userId: authenticatedUserId,
          method: 'phone',
          success: false,
          meta,
          identifier: normalizedPhone,
          failedReason: 'phone_linked_elsewhere',
        });
        throw new BadRequestException('This phone number is already linked to another BRISTI account');
      }
      if (byPhone) {
        user = byPhone;
      } else {
        user = await this.userRepo.findById(authenticatedUserId);
        if (!user) {
          throw new BadRequestException('Account not found');
        }
        user = await this.userRepo.updateById(authenticatedUserId, {
          phone: normalizedPhone,
          phoneVerified: true,
        });
      }
    } else {
      user = byPhone;
      if (!user) {
        user = await this.userRepo.create({
          phone: normalizedPhone,
          phoneVerified: true,
          authProvider: 'phone',
          firstName: 'BRISTI',
          lastName: 'Member',
          role: 'customer',
          status: 'active',
        });
      }
    }

    if (user.status !== 'active') {
      await this.recordLogin({
        userId: user._id.toString(),
        method: 'phone',
        success: false,
        meta,
        identifier: normalizedPhone,
        failedReason: 'account_inactive',
      });
      throw new BadRequestException('Account is not active');
    }

    await this.userRepo.clearFailedLogins(user._id.toString());
    await this.userRepo.updateLastLogin(user._id.toString());
    await this.recordLogin({
      userId: user._id.toString(),
      method: 'phone',
      success: true,
      meta,
      identifier: normalizedPhone,
    });

    const { accessToken, refreshToken } = await this.issueTokens(user);
    return { user: user.toObject(), accessToken, refreshToken };
  }

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

  async login(email: string, password: string, meta?: ClientMeta): Promise<{ user: IUser; accessToken: string; refreshToken: string }> {
    const user = await this.userRepo.findByCredentials(email);
    if (!user) {
      await this.recordLogin({
        method: 'email',
        success: false,
        meta,
        identifier: email,
        failedReason: 'user_not_found',
      });
      throw new BadRequestException('Invalid credentials');
    }

    await this.enforceLockout(user, meta, email);

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      await this.userRepo.registerFailedLogin(user._id.toString());
      const failed = (user.failedLoginAttempts ?? 0) + 1;
      if (failed >= LOCKOUT_THRESHOLD) {
        await this.userRepo.lockAccount(user._id.toString(), new Date(Date.now() + LOCKOUT_DURATION_MS));
      }
      await this.recordLogin({
        userId: user._id.toString(),
        method: 'email',
        success: false,
        meta,
        identifier: email,
        failedReason: 'wrong_password',
      });
      throw new BadRequestException('Invalid credentials');
    }

    if (user.status !== 'active') {
      await this.recordLogin({
        userId: user._id.toString(),
        method: 'email',
        success: false,
        meta,
        identifier: email,
        failedReason: 'account_inactive',
      });
      throw new BadRequestException('Account is not active');
    }

    await this.userRepo.clearFailedLogins(user._id.toString());
    await this.userRepo.updateLastLogin(user._id.toString());
    await this.recordLogin({
      userId: user._id.toString(),
      method: 'email',
      success: true,
      meta,
      identifier: email,
    });

    const { accessToken, refreshToken } = await this.issueTokens(user);

    return { user: user.toObject(), accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string, meta?: ClientMeta): Promise<{ accessToken: string; refreshToken: string; user: IUser }> {
    const payload = this.jwtService.verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const storedToken = await this.authRepo.findRefreshToken(refreshToken);
    if (!storedToken) {
      await this.recordLogin({
        method: 'refresh',
        success: false,
        meta,
        identifier: payload.id,
        failedReason: 'token_not_found',
      });
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Resolve the principal (customer first, then admin) and enforce activity.
    const user = await this.userRepo.findById(payload.id);
    if (user) {
      if (user.status !== 'active') {
        await this.authRepo.deleteRefreshToken(refreshToken);
        await this.sessionRepo?.revokeByHash(SessionRepository.hashToken(refreshToken));
        await this.recordLogin({
          userId: user._id.toString(),
          method: 'refresh',
          success: false,
          meta,
          failedReason: 'account_inactive',
        });
        throw new UnauthorizedError('Account is not active');
      }
    } else {
      const admin = this.adminRepo ? await this.adminRepo.findById(payload.id) : null;
      if (!admin) {
        await this.authRepo.deleteRefreshToken(refreshToken);
        await this.recordLogin({
          method: 'refresh',
          success: false,
          meta,
          identifier: payload.id,
          failedReason: 'principal_not_found',
        });
        throw new UnauthorizedError('Invalid refresh token');
      }
      if (admin.isActive === false) {
        await this.authRepo.deleteRefreshToken(refreshToken);
        throw new UnauthorizedError('Account is not active');
      }
      await this.authRepo.deleteRefreshToken(refreshToken);
      const accessToken = this.jwtService.generateAccessToken(admin as any);
      const nextRefreshToken = this.jwtService.generateRefreshToken(admin as any);
      await this.authRepo.createRefreshToken(admin._id.toString(), nextRefreshToken, this.getRefreshExpiry(), 'admin');
      return { accessToken, refreshToken: nextRefreshToken, user: admin.toObject() };
    }

    await this.authRepo.deleteRefreshToken(refreshToken);
    await this.sessionRepo?.revokeByHash(SessionRepository.hashToken(refreshToken));
    const { accessToken, refreshToken: nextRefreshToken } = await this.issueTokens(user);
    await this.recordLogin({
      userId: user._id.toString(),
      method: 'refresh',
      success: true,
      meta,
    });
    return { accessToken, refreshToken: nextRefreshToken, user: user.toObject() };
  }

  async logout(userId: string, refreshToken: string): Promise<{ message: string }> {
    if (refreshToken) {
      await this.authRepo.deleteRefreshToken(refreshToken);
      await this.sessionRepo?.revokeByHash(SessionRepository.hashToken(refreshToken));
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
    // Revoke all sessions on password reset
    await this.authRepo.deleteUserTokens(user._id.toString());
    await this.sessionRepo?.revokeAllForUser(user._id.toString());

    return { message: 'Password has been reset successfully' };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.userRepo.findByEmailVerificationToken(crypto.createHash('sha256').update(token).digest('hex'));
    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.userRepo.verifyEmail(user._id.toString());
    // Email change invalidates existing refresh tokens
    await this.authRepo.deleteUserTokens(user._id.toString());
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

    // Whitelist fields a customer may update. Never allow role/status/email/
    // password escalation through this endpoint.
    const allowed: (keyof IUser)[] = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 'preferences'];
    const update: Partial<IUser> = {};
    for (const key of allowed) {
      if (updateData[key] !== undefined) (update as any)[key] = updateData[key];
    }
    if (Object.keys(update).length === 0) {
      return user.toObject();
    }

    const updatedUser = await this.userRepo.updateById(userId, update);
    return updatedUser.toObject();
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userRepo.findByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new BadRequestException('Current password is incorrect');
    }

    await this.userRepo.updatePassword(userId, newPassword);
    await this.authRepo.deleteUserTokens(userId);
    await this.sessionRepo?.revokeAllForUser(userId);
    return { message: 'Password changed successfully' };
  }

  async getAuthStats(): Promise<{
    activeSessions: number;
    recentLogins: any[];
    recentFailedLogins: any[];
    loginsLast7Days: number;
    failedLoginsLast7Days: number;
    googleLogins: number;
    phoneLogins: number;
    emailLogins: number;
  }> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [activeSessions, recentLogins, recentFailedLogins, loginsLast7Days, failedLoginsLast7Days] = await Promise.all([
      this.sessionRepo ? this.sessionRepo.countActive() : 0,
      this.loginHistoryRepo ? this.loginHistoryRepo.recent(20, { success: true }) : [],
      this.loginHistoryRepo ? this.loginHistoryRepo.recent(20, { success: false }) : [],
      this.loginHistoryRepo ? this.loginHistoryRepo.count({ success: true, createdAt: { $gte: since } }) : 0,
      this.loginHistoryRepo ? this.loginHistoryRepo.count({ success: false, createdAt: { $gte: since } }) : 0,
    ]);

    const [googleLogins, phoneLogins, emailLogins] = await Promise.all([
      this.loginHistoryRepo ? this.loginHistoryRepo.count({ method: 'google', success: true, createdAt: { $gte: since } }) : 0,
      this.loginHistoryRepo ? this.loginHistoryRepo.count({ method: 'phone', success: true, createdAt: { $gte: since } }) : 0,
      this.loginHistoryRepo ? this.loginHistoryRepo.count({ method: 'email', success: true, createdAt: { $gte: since } }) : 0,
    ]);

    return { activeSessions, recentLogins, recentFailedLogins, loginsLast7Days, failedLoginsLast7Days, googleLogins, phoneLogins, emailLogins };
  }

  private getRefreshExpiry(): Date {
    const configuredDays = Number.parseInt(process.env.JWT_REFRESH_TOKEN_DAYS || '60', 10);
    const days = Number.isFinite(configuredDays) && configuredDays > 0 ? configuredDays : 60;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }
}

