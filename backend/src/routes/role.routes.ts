import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { AdminService } from '../services/admin.service';
import { AdminRepository } from '../repositories/admin.repository';
import { UserRepository } from '../repositories/user.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { ProductRepository } from '../repositories/product.repository';
import { OrderRepository } from '../repositories/order.repository';
import { JwtService } from '../services/jwt.service';
import { protect, authorize } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { createAdminValidation, updateAdminValidation, adminIdValidation } from '../validators/admin.validators';
import { validateRequest } from '../validators';

const adminRepo = new AdminRepository();
const userRepo = new UserRepository();
const productRepo = new ProductRepository();
const orderRepo = new OrderRepository();
const jwtService = new JwtService();
const authRepo = new AuthRepository();
const adminService = new AdminService(adminRepo, jwtService, authRepo);
const adminController = new AdminController(adminService, userRepo, productRepo, orderRepo, authRepo);

const router = Router();

router.post('/', protect, authorize('admin'), auditLog('admin', 'create'), createAdminValidation, validateRequest, adminController.createAdmin);
router.get('/', protect, authorize('admin'), adminController.getAllAdmins);
router.get('/:id', protect, authorize('admin'), adminIdValidation, validateRequest, adminController.getAdminById);
router.put('/:id', protect, authorize('admin'), auditLog('admin', 'update'), adminIdValidation, updateAdminValidation, validateRequest, adminController.updateAdmin);
router.delete('/:id', protect, authorize('admin'), auditLog('admin', 'delete'), adminIdValidation, validateRequest, adminController.deleteAdmin);

export default router;