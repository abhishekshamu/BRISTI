import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { CartService } from '../services/cart.service';
import { CartRepository } from '../repositories/cart.repository';
import { ProductRepository } from '../repositories/product.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { protect } from '../middleware/auth.middleware';
import { addToCartValidation, updateCartItemValidation, applyCouponValidation } from '../validators/cart.validators';
import { validate } from '../validators/index';

const cartRepo = new CartRepository();
const productRepo = new ProductRepository();
const couponRepo = new CouponRepository();
const cartService = new CartService(cartRepo, productRepo, couponRepo);
const cartController = new CartController(cartService);

const router = Router();

router.get('/', protect, cartController.getCart);
router.post('/add', protect, addToCartValidation, validate, cartController.addToCart);
router.put('/items/:itemId', protect, updateCartItemValidation, validate, cartController.updateCartItem);
router.delete('/items/:itemId', protect, cartController.removeFromCart);
router.delete('/clear', protect, cartController.clearCart);
router.post('/apply-coupon', protect, applyCouponValidation, validate, cartController.applyCoupon);

export default router;
