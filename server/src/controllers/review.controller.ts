import { Request, Response, NextFunction } from 'express';
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
    
    const updatedReview = await this.reviewService.updateReview(reviewId, reviewData);
    
    res.status(200).json({
      success: true,
      data: updatedReview
    });
  });

  deleteReview = asyncHandler(async (req: Request, res: Response) => {
    const { reviewId } = req.params;
    const deleted = await this.reviewService.deleteReview(reviewId);
    
    res.status(200).json({
      success: true,
      data: deleted
    });
  });
}