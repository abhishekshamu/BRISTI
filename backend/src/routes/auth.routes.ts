import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { JwtService } from '../services/jwt.service';
import { EmailService } from '../services/email.service';
import { protect } from '../middleware/auth.middleware';
import { registerValidation, loginValidation, forgotPasswordValidation, resetPasswordValidation, refreshTokenValidation, changePasswordValidation } from '../validators/auth.validators';
import { validateRequest } from '../validators';

// Initialize repositories
const userRepo = new UserRepository();
const authRepo = new AuthRepository();

// Initialize services
const jwtService = new JwtService();
const emailService = new EmailService();
const authService = new AuthService(userRepo, authRepo, jwtService, emailService);

// Initialize controller
const authController = new AuthController(authService);

const router = Router();

// Public routes
router.post('/register', registerValidation, validateRequest, authController.register);
router.post('/login', loginValidation, validateRequest, authController.login);
router.post('/refresh-token', refreshTokenValidation, validateRequest, authController.refreshToken);
router.post('/forgot-password', forgotPasswordValidation, validateRequest, authController.forgotPassword);
router.post('/reset-password/:token', resetPasswordValidation, validateRequest, authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

// Protected routes
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.put('/update-profile', protect, authController.updateProfile);
router.put('/change-password', protect, changePasswordValidation, validateRequest, authController.changePassword);

export default router;
