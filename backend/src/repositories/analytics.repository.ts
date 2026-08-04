import { AnalyticsEventModel } from '../models/AnalyticsEvent';
import { BaseRepository } from './base.repository';
import { IAnalyticsEvent } from 'shared/types';

export class AnalyticsRepository extends BaseRepository<IAnalyticsEvent> {
  constructor() {
    super(AnalyticsEventModel);
  }

  async findByEventName(eventName: string, options: any = {}): Promise<IAnalyticsEvent[]> {
    return this.findMany({ eventName }, { sort: { timestamp: -1 }, ...options });
  }

  async findByUser(userId: string, options: any = {}): Promise<IAnalyticsEvent[]> {
    return this.findMany({ userId }, { sort: { timestamp: -1 }, ...options });
  }

  async findBySession(sessionId: string, options: any = {}): Promise<IAnalyticsEvent[]> {
    return this.findMany({ sessionId }, { sort: { timestamp: -1 }, ...options });
  }

  async getEventStats(startDate?: Date, endDate?: Date): Promise<any> {
    const match: any = {};
    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) match.timestamp.$gte = startDate;
      if (endDate) match.timestamp.$lte = endDate;
    }

    return this.model.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$eventName',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      }
    ]).exec();
  }
}

