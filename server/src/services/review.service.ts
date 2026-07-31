import { ReviewRepository } from '../repositories/review.repository';
import { ProductRepository } from '../repositories/product.repository';
import { UserRepository } from '../repositories/user.repository';
import { NotificationService } from './notification.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { notifyAdmins } from './admin-notifier';
import { IReview } from 'shared/types';
import { NotFoundException, BadRequestException } from '../utils/exceptions';

export class ReviewService {
  constructor(
    private reviewRepo: ReviewRepository,
    private productRepo: ProductRepository,
    private userRepo: UserRepository,
    private notificationService: NotificationService = new NotificationService(new NotificationRepository())
  ) {}

  async createReview(reviewData: Partial<IReview>): Promise<IReview> {
    const { productId, userId, rating, title, comment } = reviewData;

    if (!productId || !userId || !rating || !comment) {
      throw new BadRequestException('Please provide productId, userId, rating, and comment');
    }

    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingReview = await this.reviewRepo.findByProductAndUser(productId, userId);
    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    const review = await this.reviewRepo.create({
      ...reviewData,
      userName: `${user.firstName} ${user.lastName}`,
      verifiedPurchase: true,
      status: 'pending'
    });

    // Notify admins of a pending review requiring moderation
    await notifyAdmins(this.notificationService, {
      title: 'New Product Review',
      message: `${user.firstName} ${user.lastName} left a ${rating}-star review on "${product.name}" (pending moderation).`,
      type: 'info',
      relatedId: review._id,
      relatedType: 'Review',
    });

    return review;
  }

  async getProductReviews(productId: string, options: any = {}): Promise<IReview[]> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.reviewRepo.findByProductId(productId, options);
  }

  async getFeaturedReviews(limit: number = 6): Promise<IReview[]> {
    return this.reviewRepo.findMany(
      { status: 'approved', rating: { $gte: 4 } },
      { sort: { helpfulVotes: -1, createdAt: -1 }, limit }
    );
  }

  async updateReview(reviewId: string, updateData: Partial<IReview>): Promise<IReview> {
    const review = await this.reviewRepo.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.reviewRepo.updateById(reviewId, updateData);
  }

  async deleteReview(reviewId: string): Promise<boolean> {
    const review = await this.reviewRepo.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.reviewRepo.deleteById(reviewId);
  }
}

