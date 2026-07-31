import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { SettingsService } from '../services/settings.service';
import { SettingsRepository } from '../repositories/settings.repository';
import { protect, authorize } from '../middleware/auth.middleware';

const settingsRepo = new SettingsRepository();
const settingsService = new SettingsService(settingsRepo);
const settingsController = new SettingsController(settingsService);

const router = Router();

router.get('/', settingsController.getSettings);
router.put('/', protect, authorize('admin'), settingsController.updateSettings);
router.put('/branding', protect, authorize('admin'), settingsController.updateBranding);
router.put('/colors', protect, authorize('admin'), settingsController.updateColors);
router.put('/typography', protect, authorize('admin'), settingsController.updateTypography);
router.put('/layout', protect, authorize('admin'), settingsController.updateLayout);
router.put('/contact-info', protect, authorize('admin'), settingsController.updateContactInfo);
router.put('/social-links', protect, authorize('admin'), settingsController.updateSocialLinks);
router.put('/seo', protect, authorize('admin'), settingsController.updateSEO);
router.put('/store', protect, authorize('admin'), settingsController.updateStoreSettings);
router.put('/navbar', protect, authorize('admin'), settingsController.updateNavbar);
router.put('/footer', protect, authorize('admin'), settingsController.updateFooter);
router.get('/homepage', protect, authorize('admin'), settingsController.getHomepage);
router.put('/homepage', protect, authorize('admin'), settingsController.updateHomepage);

export default router;
