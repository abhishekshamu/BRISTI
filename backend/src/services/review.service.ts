import { ReviewRepository } from '../repositories/review.repository';
import { ProductRepository } from '../repositories/product.repository';
import { UserRepository } from '../repositories/user.repository';
import { OrderRepository } from '../repositories/order.repository';
import { NotificationService } from './notification.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { notifyAdmins } from './admin-notifier';
import { IReview } from 'shared/types';
import { NotFoundException, BadRequestException, ForbiddenError } from '../utils/exceptions';

const REVIEW_STATUSES = ['pending', 'approved', 'rejected'];

// Fields a customer may set on their own review (moderator-only fields like
// `status`, `verifiedPurchase` and `helpfulVotes` are excluded).
const CUSTOMER_UPDATABLE: (keyof IReview)[] = ['rating', 'title', 'comment', 'images'];

// Order statuses that count as a verified purchase.
const PURCHASED_STATUSES = ['delivered', 'completed'];

export class ReviewService {
  constructor(
    private reviewRepo: ReviewRepository,
    private productRepo: ProductRepository,
    private userRepo: UserRepository,
    private orderRepo: OrderRepository = new OrderRepository(),
    private notificationService: NotificationService = new NotificationService(new NotificationRepository())
  ) {}

  private async hasPurchasedProduct(userId: string, productId: string): Promise<boolean> {
    try {
      return await this.orderRepo.exists({
        userId,
        'items.productId': productId,
        status: { $in: PURCHASED_STATUSES }
      });
    } catch {
      return false;
    }
  }

  async createReview(reviewData: Partial<IReview>): Promise<IReview> {
    const { productId, userId, rating, comment } = reviewData;

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
      // Only a delivered/completed order for this product proves a purchase.
      verifiedPurchase: await this.hasPurchasedProduct(userId, productId),
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

  /** Customer-facing update: ownership enforced, fields whitelisted. */
  async updateReview(
    reviewId: string,
    updateData: Partial<IReview>,
    actor: { userId?: string; authType?: 'user' | 'admin'; role?: string } = {}
  ): Promise<IReview> {
    const review = await this.reviewRepo.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const isAdmin = actor.authType === 'admin';

    if (!isAdmin) {
      if (String(review.userId) !== String(actor.userId)) {
        throw new ForbiddenError('You can only edit your own review');
      }
    }

    const allowed = isAdmin ? [...CUSTOMER_UPDATABLE, 'status'] : CUSTOMER_UPDATABLE;
    const update: Partial<IReview> = {};
    for (const key of allowed) {
      if ((updateData as any)[key] !== undefined) (update as any)[key] = (updateData as any)[key];
    }
    if (isAdmin && update.status !== undefined) {
      if (!REVIEW_STATUSES.includes(String(update.status))) {
        throw new BadRequestException('Invalid review status');
      }
    }

    const updated = await this.reviewRepo.updateById(reviewId, update);
    if (!updated) {
      throw new NotFoundException('Review not found');
    }

    // Rating counters go stale when a rating/status changes.
    await this.recomputeProductRating(String(review.productId));

    return updated;
  }

  async deleteReview(
    reviewId: string,
    actor: { userId?: string; authType?: 'user' | 'admin'; role?: string } = {}
  ): Promise<boolean> {
    const review = await this.reviewRepo.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const isAdmin = actor.authType === 'admin';
    if (!isAdmin && String(review.userId) !== String(actor.userId)) {
      throw new ForbiddenError('You can only delete your own review');
    }

    const productId = String(review.productId);
    const deleted = await this.reviewRepo.deleteById(reviewId);
    if (deleted) {
      await this.recomputeProductRating(productId);
    }
    return deleted;
  }

  /** Admin moderation list with optional status filter + pagination. */
  async listReviews(options: any = {}): Promise<any> {
    const { status, ...paginateOptions } = options;
    const filter: any = {};
    if (status && status !== 'all') filter.status = status;
    return this.reviewRepo.paginate(filter, paginateOptions);
  }

  /** Admin moderation: approve / reject / restore a review. */
  async updateReviewStatus(reviewId: string, status: string): Promise<IReview> {
    if (!REVIEW_STATUSES.includes(status)) {
      throw new BadRequestException('Invalid review status');
    }
    const review = await this.reviewRepo.findById(reviewId);
    if (!review) {
      throw new NotFoundException('Review not found');
    }
    const updated = await this.reviewRepo.updateById(reviewId, { status });
    if (updated) {
      await this.recomputeProductRating(String(review.productId));
    }
    return updated;
  }

  private async recomputeProductRating(productId: string): Promise<void> {
    try {
      const stats = await this.reviewRepo.getApprovedRatingStats(productId);
      await this.productRepo.updateById(productId, { rating: stats });
    } catch {
      // rating refresh is best-effort; never fail the review operation on it
    }
  }
}
