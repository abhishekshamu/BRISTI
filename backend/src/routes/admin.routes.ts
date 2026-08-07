import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { AdminService } from '../services/admin.service';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { AdminRepository } from '../repositories/admin.repository';
import { UserRepository } from '../repositories/user.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { SessionRepository } from '../repositories/session.repository';
import { LoginHistoryRepository } from '../repositories/login-history.repository';
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
const authRepo = new AuthRepository();
const sessionRepo = new SessionRepository();
const loginHistoryRepo = new LoginHistoryRepository();
const adminService = new AdminService(adminRepo, jwtService, emailService, authRepo);
const userService = new UserService(userRepo);
const authService = new AuthService(userRepo, authRepo, jwtService, emailService, undefined, undefined, sessionRepo, loginHistoryRepo, adminRepo);
const adminController = new AdminController(adminService, userService, userRepo, productRepo, orderRepo, authRepo, authService);

const router = Router();

router.post('/login', adminController.login);
router.post('/logout', protect, authorize('admin'), adminController.logout);
router.get('/dashboard/stats', protect, authorize('admin'), adminController.getDashboardStats);
router.get('/auth-stats', protect, authorize('admin'), adminController.getAuthStats);
// Self-service account endpoints — registered before '/:id' so the literal
// segments are not captured as Mongo ids.
router.get('/me', protect, authorize('admin'), adminController.getMe);
router.post('/me/change-password', protect, authorize('admin'), adminController.changePassword);
router.get('/', protect, authorize('admin'), adminController.getAllAdmins);
router.get('/:id', protect, authorize('admin'), adminController.getAdminById);
router.put('/:id', protect, authorize('admin'), adminController.updateAdmin);
router.delete('/:id', protect, authorize('admin'), adminController.deleteAdmin);

export default router;
