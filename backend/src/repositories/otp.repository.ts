import { OtpCodeModel } from '../models/OtpCode';
import { BaseRepository } from './base.repository';

export type OtpPurpose = 'login' | 'phone_verification';

export class OtpRepository extends BaseRepository<any> {
  constructor() {
    super(OtpCodeModel);
  }

  async findActive(phone: string, purpose: OtpPurpose): Promise<any | null> {
    return this.findOne({ phone, purpose, consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
  }

  async saveCode(data: {
    phone: string;
    otpHash: string;
    purpose: OtpPurpose;
    lastSentAt: Date;
    expiresAt: Date;
  }): Promise<any> {
    // Upsert so there is exactly one live code per phone + purpose.
    return this.model.findOneAndUpdate(
      { phone: data.phone, purpose: data.purpose },
      { $set: { ...data, attempts: 0 }, $unset: { consumedAt: '' } },
      { upsert: true, new: true }
    );
  }

  async incrementAttempts(id: string): Promise<any | null> {
    return this.findByIdAndUpdate(id, { $inc: { attempts: 1 } }, { new: true });
  }

  async markConsumed(id: string): Promise<void> {
    await this.model.updateOne({ _id: id }, { $set: { consumedAt: new Date() } });
  }

  async deleteForPhone(phone: string, purpose: OtpPurpose): Promise<void> {
    await this.model.deleteMany({ phone, purpose });
  }
}
