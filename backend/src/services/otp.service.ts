import crypto from 'crypto';
import { OtpRepository, OtpPurpose } from '../repositories/otp.repository';
import { SmsService } from './sms.service';
import { BadRequestException, TooManyRequestsError } from '../utils/exceptions';

const OTP_LIFETIME_MS = 5 * 60 * 1000;      // 5 minute expiry
const RESEND_COOLDOWN_MS = 30 * 1000;       // 30 second resend timer
const MAX_ATTEMPTS = 5;                     // max verification attempts per code

export class OtpService {
  constructor(
    private otpRepo: OtpRepository,
    private smsService: SmsService
  ) {}

  async sendOtp(phone: string, purpose: OtpPurpose = 'login'): Promise<{ sent: boolean; resendInSeconds: number }> {
    const existing = await this.otpRepo.findActive(phone, purpose);
    if (existing) {
      const elapsed = Date.now() - new Date(existing.lastSentAt).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        throw new TooManyRequestsError(`Please wait ${Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000)} seconds before requesting a new code`);
      }
    }

    const otp = this.generateOtp();
    const now = new Date();
    await this.otpRepo.saveCode({
      phone,
      otpHash: this.hashOtp(otp),
      purpose,
      lastSentAt: now,
      expiresAt: new Date(now.getTime() + OTP_LIFETIME_MS),
    });

    await this.smsService.sendOtp(phone, otp);

    return { sent: true, resendInSeconds: Math.ceil(RESEND_COOLDOWN_MS / 1000) };
  }

  /** Verifies a code and returns true when correct; throws on wrong/expired codes. */
  async verifyOtp(phone: string, otp: string, purpose: OtpPurpose = 'login'): Promise<void> {
    const record = await this.otpRepo.findActive(phone, purpose);
    if (!record) {
      throw new BadRequestException('Code expired or not found. Please request a new code.');
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await this.otpRepo.deleteForPhone(phone, purpose);
      throw new TooManyRequestsError('Too many incorrect attempts. Please request a new code.');
    }

    if (this.hashOtp(otp) !== record.otpHash) {
      await this.otpRepo.incrementAttempts(record._id);
      throw new BadRequestException('Incorrect code. Please try again.');
    }

    await this.otpRepo.markConsumed(record._id);
  }

  private generateOtp(): string {
    return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }
}
