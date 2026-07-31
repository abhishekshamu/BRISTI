import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { AdminService } from '../services/admin.service';
import { UserService } from '../services/user.service';
import { AdminRepository } from '../repositories/admin.repository';
import { UserRepository } from '../repositories/user.repository';
import { ProductRepository } from '../repositories/product.repository';
import { OrderRepository } from '../repositories/order.repository';
import { JwtService } from '../services/jwt.service';
import { EmailService } from '../services/email.service';
import { protect, authorize } from '../middleware/auth.middleware';

const adminRepo = new AdminRepository();
const userRepo = new UserRepository();
const productRepo = new ProductRepository();
const orderRepo = new OrderRepository();
const jwtService = new JwtService();
const emailService = new EmailService();
const adminService = new AdminService(adminRepo, jwtService, emailService);
const userService = new UserService(userRepo);
const adminController = new AdminController(adminService, userService, userRepo, productRepo, orderRepo);

const router = Router();

router.post('/login', adminController.login);
router.post('/register', adminController.register);
router.get('/dashboard/stats', protect, authorize('admin'), adminController.getDashboardStats);
router.get('/', protect, authorize('admin'), adminController.getAllAdmins);
router.get('/:id', protect, authorize('admin'), adminController.getAdminById);
router.put('/:id', protect, authorize('admin'), adminController.updateAdmin);
router.delete('/:id', protect, authorize('admin'), adminController.deleteAdmin);

export default router;
