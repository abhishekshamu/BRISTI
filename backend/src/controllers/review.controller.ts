import { Request, Response } from 'express';
import { ReviewService } from '../services/review.service';
import { asyncHandler } from '../middleware/async';
import { ValidationError } from '../utils/exceptions';

export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  createReview = asyncHandler(async (req: Request, res: Response) => {
    const { productId, rating, title, comment, images } = req.body;
    const userId = req.user?.id;

    if (!userId || !productId || !rating || !comment) {
      throw new ValidationError('Please provide productId, rating, title, and comment');
    }

    const review = await this.reviewService.createReview({
      productId,
      userId,
      rating,
      title,
      comment,
      images
    });

    res.status(201).json({
      success: true,
      data: review
    });
  });

  getProductReviews = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await this.reviewService.getProductReviews(productId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.status(200).json({
      success: true,
      data: reviews
    });
  });

  getFeaturedReviews = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 6 } = req.query;
    const reviews = await this.reviewService.getFeaturedReviews(parseInt(limit as string));
    res.status(200).json({
      success: true,
      data: reviews
    });
  });

  updateReview = asyncHandler(async (req: Request, res: Response) => {
    const { reviewId } = req.params;
    const reviewData = req.body;

    const updatedReview = await this.reviewService.updateReview(reviewId, reviewData, {
      userId: req.user?.id,
      authType: req.authType,
      role: req.user?.role
    });

    res.status(200).json({
      success: true,
      data: updatedReview
    });
  });

  deleteReview = asyncHandler(async (req: Request, res: Response) => {
    const { reviewId } = req.params;
    const deleted = await this.reviewService.deleteReview(reviewId, {
      userId: req.user?.id,
      authType: req.authType,
      role: req.user?.role
    });

    res.status(200).json({
      success: true,
      data: deleted
    });
  });

  listReviews = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status } = req.query;
    const result = await this.reviewService.listReviews({
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { createdAt: -1 },
      status
    });

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages
      }
    });
  });

  updateReviewStatus = asyncHandler(async (req: Request, res: Response) => {
    const { reviewId } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new ValidationError('Please provide a status');
    }

    const review = await this.reviewService.updateReviewStatus(reviewId, status);
    res.status(200).json({
      success: true,
      data: review
    });
  });
}
