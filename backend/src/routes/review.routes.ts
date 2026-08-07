import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { ReviewService } from '../services/review.service';
import { ReviewRepository } from '../repositories/review.repository';
import { ProductRepository } from '../repositories/product.repository';
import { UserRepository } from '../repositories/user.repository';
import { protect, authorize } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import {
  createReviewValidation,
  updateReviewValidation,
  updateReviewStatusValidation,
  deleteReviewValidation
} from '../validators/review.validators';
import { validate } from '../validators/index';

const reviewRepo = new ReviewRepository();
const productRepo = new ProductRepository();
const userRepo = new UserRepository();
const reviewService = new ReviewService(reviewRepo, productRepo, userRepo);
const reviewController = new ReviewController(reviewService);

const router = Router();

router.get('/featured', reviewController.getFeaturedReviews);
router.get('/product/:productId', reviewController.getProductReviews);

router.post('/', protect, createReviewValidation, validate, reviewController.createReview);
router.put('/:reviewId', protect, updateReviewValidation, validate, reviewController.updateReview);
router.delete('/:reviewId', protect, deleteReviewValidation, validate, reviewController.deleteReview);

// Admin moderation
router.get('/', protect, authorize('admin'), reviewController.listReviews);
router.patch('/:reviewId/status', protect, authorize('admin'), auditLog('review', 'update'), updateReviewStatusValidation, validate, reviewController.updateReviewStatus);

export default router;
