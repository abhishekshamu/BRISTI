import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { ProductService } from '../services/product.service';
import { ProductRepository } from '../repositories/product.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CollectionRepository } from '../repositories/collection.repository';
import { ReviewRepository } from '../repositories/review.repository';
import { InventoryItemRepository } from '../repositories/inventory-item.repository';
import { WishlistRepository } from '../repositories/wishlist.repository';
import { CartRepository } from '../repositories/cart.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { NotificationService } from '../services/notification.service';
import { NotificationRepository } from '../repositories/notification.repository';
import { protect, authorize, optionalAuth } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { validateRequest } from '../validators';
import { createProductValidation, updateProductValidation, searchProductsValidation } from '../validators/product.validators';

const productRepo = new ProductRepository();
const categoryRepo = new CategoryRepository();
const collectionRepo = new CollectionRepository();
const reviewRepo = new ReviewRepository();
const inventoryRepo = new InventoryItemRepository();
const wishlistRepo = new WishlistRepository();
const cartRepo = new CartRepository();
const couponRepo = new CouponRepository();
const notificationService = new NotificationService(new NotificationRepository());
const productService = new ProductService(
  productRepo,
  categoryRepo,
  collectionRepo,
  reviewRepo,
  inventoryRepo,
  wishlistRepo,
  cartRepo,
  couponRepo,
  notificationService
);
const productController = new ProductController(productService);

const router = Router();

router.get('/', productController.getProducts);
router.get('/featured', productController.getFeaturedProducts);
router.get('/new-arrivals', productController.getNewArrivals);
router.get('/on-sale', productController.getOnSaleProducts);
router.get('/best-sellers', productController.getBestSellers);
router.get('/trending', productController.getTrendingProducts);
router.get('/by-ids', productController.getByIds);
router.get('/search', searchProductsValidation, validateRequest, productController.searchProducts);
router.get('/related/:productId', productController.getRelatedProducts);
router.get('/category/:categoryId', productController.getProductsByCategory);
router.get('/collection/:collectionId', productController.getProductsByCollection);
router.get('/slug/:slug', optionalAuth, productController.getProductBySlug);
router.get('/:productId/reviews', productController.getProductReviews);
router.post('/:productId/reviews', protect, productController.addProductReview);
router.get('/:id', optionalAuth, productController.getProductById);

router.post('/', protect, authorize('admin'), auditLog('product', 'create'), createProductValidation, validateRequest, productController.createProduct);
router.put('/:id', protect, authorize('admin'), auditLog('product', 'update'), updateProductValidation, validateRequest, productController.updateProduct);
router.delete('/:id', protect, authorize('admin'), auditLog('product', 'delete'), productController.deleteProduct);
router.put('/:productId/stock', protect, authorize('admin'), auditLog('product', 'update'), productController.updateProductStock);

export default router;
