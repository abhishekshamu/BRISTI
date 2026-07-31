import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { CategoryService } from '../services/category.service';
import { CategoryRepository } from '../repositories/category.repository';
import { ProductRepository } from '../repositories/product.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { protect, authorize } from '../middleware/auth.middleware';

const categoryRepo = new CategoryRepository();
const productRepo = new ProductRepository();
const couponRepo = new CouponRepository();
const categoryService = new CategoryService(categoryRepo, productRepo, couponRepo);
const categoryController = new CategoryController(categoryService);

const router = Router();

router.get('/', categoryController.getCategories);
router.get('/tree', categoryController.getCategoryTree);
router.get('/:id', categoryController.getCategoryById);
router.get('/slug/:slug', categoryController.getCategoryBySlug);
router.get('/:categoryId/products', categoryController.getCategoryProducts);

router.post('/', protect, authorize('admin'), categoryController.createCategory);
router.put('/:id', protect, authorize('admin'), categoryController.updateCategory);
router.delete('/:id', protect, authorize('admin'), categoryController.deleteCategory);

export default router;
