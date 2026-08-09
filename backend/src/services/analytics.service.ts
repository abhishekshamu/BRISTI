import { AnalyticsRepository } from '../repositories/analytics.repository';
import { IAnalyticsEvent } from '../../shared/types';

export class AnalyticsService {
  constructor(private analyticsRepo: AnalyticsRepository) {}

  async createEvent(data: Partial<IAnalyticsEvent>): Promise<IAnalyticsEvent> {
    return this.analyticsRepo.create({
      ...data,
      timestamp: data.timestamp || new Date()
    });
  }

  async getEventsByEventName(eventName: string, options: any = {}): Promise<IAnalyticsEvent[]> {
    return this.analyticsRepo.findByEventName(eventName, options);
  }

  async getEventsByUser(userId: string, options: any = {}): Promise<IAnalyticsEvent[]> {
    return this.analyticsRepo.findByUser(userId, options);
  }

  async getEventsBySession(sessionId: string, options: any = {}): Promise<IAnalyticsEvent[]> {
    return this.analyticsRepo.findBySession(sessionId, options);
  }

  async getAllEvents(options: any = {}): Promise<any> {
    return this.analyticsRepo.paginate({}, options);
  }

  async getEventStats(startDate?: Date, endDate?: Date): Promise<any> {
    return this.analyticsRepo.getEventStats(startDate, endDate);
  }

  async getPopularEvents(limit: number = 10): Promise<any> {
    const stats = await this.analyticsRepo.getEventStats();
    return stats.slice(0, limit);
  }

  async getActiveUsers(startDate?: Date, endDate?: Date): Promise<any> {
    return this.analyticsRepo.aggregate([
      {
        $match: {
          ...(startDate || endDate ? {
            timestamp: {
              ...(startDate ? { $gte: startDate } : {}),
              ...(endDate ? { $lte: endDate } : {})
            }
          } : {}),
          userId: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$userId',
          eventCount: { $sum: 1 },
          lastActive: { $max: '$timestamp' }
        }
      },
      { $sort: { lastActive: -1 } }
    ]);
  }

  async getPageViews(startDate?: Date, endDate?: Date): Promise<any> {
    return this.analyticsRepo.aggregate([
      {
        $match: {
          eventName: 'page_view',
          ...(startDate || endDate ? {
            timestamp: {
              ...(startDate ? { $gte: startDate } : {}),
              ...(endDate ? { $lte: endDate } : {})
            }
          } : {})
        }
      },
      {
        $group: {
          _id: {
            url: '$url',
            day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          views: { $sum: 1 },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      { $sort: { views: -1 } }
    ]);
  }
}

