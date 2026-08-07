import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { CategoryService } from '../services/category.service';
import { CategoryRepository } from '../repositories/category.repository';
import { ProductRepository } from '../repositories/product.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { protect, authorize } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { createCategoryValidation, updateCategoryValidation } from '../validators/category.validators';
import { validateRequest } from '../validators';

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

router.post('/', protect, authorize('admin'), auditLog('category', 'create'), createCategoryValidation, validateRequest, categoryController.createCategory);
router.put('/:id', protect, authorize('admin'), auditLog('category', 'update'), updateCategoryValidation, validateRequest, categoryController.updateCategory);
router.delete('/:id', protect, authorize('admin'), auditLog('category', 'delete'), categoryController.deleteCategory);

export default router;
