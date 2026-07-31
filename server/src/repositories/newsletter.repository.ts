import { NewsletterSubscriberModel } from '../models/NewsletterSubscriber';
import { BaseRepository } from './base.repository';
import { INewsletterSubscriber } from 'shared/types';

export class NewsletterRepository extends BaseRepository<INewsletterSubscriber> {
  constructor() {
    super(NewsletterSubscriberModel);
  }

  async findByEmail(email: string): Promise<INewsletterSubscriber | null> {
    return this.findOne({ email: new RegExp(`^${email}$`, 'i') });
  }

  async findActive(options: any = {}): Promise<INewsletterSubscriber[]> {
    return this.findMany({ isActive: true }, options);
  }

  async findBySource(source: string, options: any = {}): Promise<INewsletterSubscriber[]> {
    return this.findMany({ source }, options);
  }

  async subscribe(data: Partial<INewsletterSubscriber>): Promise<INewsletterSubscriber> {
    // Check if already exists
    const existing = await this.findByEmail(data.email as string);
    if (existing) {
      // If exists but inactive, reactivate
      if (!existing.isActive) {
        return this.updateById(existing._id.toString(), {
          ...data,
          isActive: true,
          subscribedAt: new Date()
        });
      }
      // If already active, just return it
      return existing;
    }
    
    // Otherwise create new
    return this.create(data);
  }

  async unsubscribe(email: string): Promise<INewsletterSubscriber | null> {
    return this.findOneAndUpdate(
      { email: new RegExp(`^${email}$`, 'i') },
      { $set: { isActive: false, unsubscribedAt: new Date() } },
      { new: true }
    );
  }

  async getSubscriptionStats(): Promise<any> {
    return this.model.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: ['$isActive', 1, 0] }
          }
        }
      }
    ]).exec();
  }

  async getGrowthStats(days: number = 30): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.model.aggregate([
      {
        $match: {
          subscribedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$subscribedAt' },
            month: { $month: '$subscribedAt' },
            day: { $dayOfMonth: '$subscribedAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 }
      }
    ]).exec();
  }
}
