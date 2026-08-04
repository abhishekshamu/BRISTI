import { ReviewModel } from '../models/Review';
import { BaseRepository } from './base.repository';
import { IReview } from 'shared/types';
import { Types } from 'mongoose';

export class ReviewRepository extends BaseRepository<IReview> {
  constructor() {
    super(ReviewModel);
  }

  async findByProductId(productId: string, options: any = {}): Promise<IReview[]> {
    return this.findMany(
      { productId, status: 'approved' },
      { sort: { createdAt: -1 }, ...options }
    );
  }

  async findByUser(userId: string, options: any = {}): Promise<IReview[]> {
    return this.findMany({ userId }, options);
  }

  async findByProductAndUser(productId: string, userId: string): Promise<IReview | null> {
    return this.findOne({ productId, userId });
  }

  async getProductRating(productId: string): Promise<any> {
    return this.model.aggregate([
      { $match: { productId: new Types.ObjectId(productId), status: 'approved' } },
      {
        $group: {
          _id: '$productId',
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          fiveStar: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          fourStar: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          threeStar: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          twoStar: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          oneStar: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]).exec();
  }

  async getApprovedRatingStats(productId: string): Promise<{ average: number; count: number }> {
    const stats = await this.model.aggregate([
      { $match: { productId: new Types.ObjectId(productId), status: 'approved' } },
      {
        $group: {
          _id: null,
          average: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]).exec();
    return {
      average: stats.length > 0 ? Number(Number(stats[0].average).toFixed(1)) : 0,
      count: stats.length > 0 ? stats[0].count : 0,
    };
  }
}
