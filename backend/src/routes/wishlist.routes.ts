import { Router } from 'express';
import { WishlistController } from '../controllers/wishlist.controller';
import { WishlistService } from '../services/wishlist.service';
import { WishlistRepository } from '../repositories/wishlist.repository';
import { ProductRepository } from '../repositories/product.repository';
import { UserRepository } from '../repositories/user.repository';
import { protect } from '../middleware/auth.middleware';
import { addToWishlistValidation, removeFromWishlistValidation } from '../validators/wishlist.validators';
import { validate } from '../validators/index';

const wishlistRepo = new WishlistRepository();
const productRepo = new ProductRepository();
const userRepo = new UserRepository();
const wishlistService = new WishlistService(wishlistRepo, productRepo, userRepo);
const wishlistController = new WishlistController(wishlistService);

const router = Router();

router.get('/', protect, wishlistController.getWishlist);
router.delete('/', protect, wishlistController.clearWishlist);
router.post('/', protect, addToWishlistValidation, validate, wishlistController.addToWishlist);
router.delete('/:productId', protect, removeFromWishlistValidation, validate, wishlistController.removeFromWishlist);
router.get('/check/:productId', protect, wishlistController.checkInWishlist);

export default router;
