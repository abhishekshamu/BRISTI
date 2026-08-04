import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { ReviewService } from '../services/review.service';
import { ReviewRepository } from '../repositories/review.repository';
import { ProductRepository } from '../repositories/product.repository';
import { UserRepository } from '../repositories/user.repository';
import { protect } from '../middleware/auth.middleware';
import { createReviewValidation, updateReviewValidation, deleteReviewValidation } from '../validators/review.validators';
import { validate } from '../validators/index';

const reviewRepo = new ReviewRepository();
const productRepo = new ProductRepository();
const userRepo = new UserRepository();
const reviewService = new ReviewService(reviewRepo, productRepo, userRepo);
const reviewController = new ReviewController(reviewService);

const router = Router();

router.get('/featured', reviewController.getFeaturedReviews);
router.get('/product/:productId', reviewController.getProductReviews);
router.put('/:reviewId', protect, updateReviewValidation, validate, reviewController.updateReview);

router.post('/', protect, createReviewValidation, validate, reviewController.createReview);
router.delete('/:reviewId', protect, deleteReviewValidation, validate, reviewController.deleteReview);

export default router;
