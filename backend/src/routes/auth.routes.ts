import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { UserRepository } from '../repositories/user.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { AdminRepository } from '../repositories/admin.repository';
import { SessionRepository } from '../repositories/session.repository';
import { LoginHistoryRepository } from '../repositories/login-history.repository';
import { JwtService } from '../services/jwt.service';
import { EmailService } from '../services/email.service';
import { OtpService } from '../services/otp.service';
import { OtpRepository } from '../repositories/otp.repository';
import { SmsService } from '../services/sms.service';
import { GoogleService } from '../services/google.service';
import { protect, optionalAuth } from '../middleware/auth.middleware';
import { registerValidation, loginValidation, forgotPasswordValidation, resetPasswordValidation, refreshTokenValidation, changePasswordValidation, updateProfileValidation, googleLoginValidation, requestOtpValidation, verifyOtpValidation } from '../validators/auth.validators';
import { validateRequest } from '../validators';

// Initialize repositories
const userRepo = new UserRepository();
const authRepo = new AuthRepository();
const adminRepo = new AdminRepository();
const sessionRepo = new SessionRepository();
const loginHistoryRepo = new LoginHistoryRepository();
const otpRepo = new OtpRepository();

// Initialize services
const jwtService = new JwtService();
const emailService = new EmailService();
const smsService = new SmsService();
const otpService = new OtpService(otpRepo, smsService);
const googleService = new GoogleService();
const authService = new AuthService(userRepo, authRepo, jwtService, emailService, otpService, googleService, sessionRepo, loginHistoryRepo, adminRepo);

// Initialize controller
const authController = new AuthController(authService);

const router = Router();

// Public routes
router.post('/register', registerValidation, validateRequest, authController.register);
router.post('/login', loginValidation, validateRequest, authController.login);
router.post('/google', optionalAuth, googleLoginValidation, validateRequest, authController.googleLogin);
router.post('/otp/request', optionalAuth, requestOtpValidation, validateRequest, authController.requestOtp);
router.post('/otp/verify', optionalAuth, verifyOtpValidation, validateRequest, authController.verifyOtp);
router.post('/refresh-token', refreshTokenValidation, validateRequest, authController.refreshToken);
router.post('/forgot-password', forgotPasswordValidation, validateRequest, authController.forgotPassword);
router.post('/reset-password/:token', resetPasswordValidation, validateRequest, authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

// Protected routes
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.put('/update-profile', protect, updateProfileValidation, validateRequest, authController.updateProfile);
router.put('/change-password', protect, changePasswordValidation, validateRequest, authController.changePassword);

export default router;
