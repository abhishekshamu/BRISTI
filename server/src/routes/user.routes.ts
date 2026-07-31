import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { UserRepository } from '../repositories/user.repository';
import { protect } from '../middleware/auth.middleware';
import { validateRequest } from '../validators';
import { addressIdValidation, createAddressValidation, preferencesValidation, updateAddressValidation, updateProfileValidation } from '../validators/user.validators';

const userRepo = new UserRepository();
const userService = new UserService(userRepo);
const userController = new UserController(userService);

const router = Router();

router.get('/profile', protect, userController.getProfile);
router.put('/profile', protect, updateProfileValidation, validateRequest, userController.updateProfile);
router.put('/change-password', protect, userController.changePassword);
router.delete('/account', protect, userController.deleteAccount);
router.get('/addresses', protect, userController.listAddresses);
router.post('/addresses', protect, createAddressValidation, validateRequest, userController.addAddress);
router.put('/addresses/:addressId', protect, updateAddressValidation, validateRequest, userController.updateAddress);
router.delete('/addresses/:addressId', protect, addressIdValidation, validateRequest, userController.deleteAddress);
router.put('/addresses/:addressId/default', protect, addressIdValidation, validateRequest, userController.setDefaultAddress);
router.put('/preferences', protect, preferencesValidation, validateRequest, userController.updatePreferences);

export default router;
