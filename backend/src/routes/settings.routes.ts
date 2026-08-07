import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { SettingsService } from '../services/settings.service';
import { SettingsRepository } from '../repositories/settings.repository';
import { protect, authorize } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';

const settingsRepo = new SettingsRepository();
const settingsService = new SettingsService(settingsRepo);
const settingsController = new SettingsController(settingsService);

const router = Router();

router.get('/', settingsController.getSettings);
router.put('/', protect, authorize('admin'), auditLog('settings', 'update'), settingsController.updateSettings);
router.put('/branding', protect, authorize('admin'), auditLog('settings', 'update'), settingsController.updateBranding);
router.put('/colors', protect, authorize('admin'), auditLog('settings', 'update'), settingsController.updateColors);
router.put('/typography', protect, authorize('admin'), auditLog('settings', 'update'), settingsController.updateTypography);
router.put('/layout', protect, authorize('admin'), auditLog('settings', 'update'), settingsController.updateLayout);
router.put('/contact-info', protect, authorize('admin'), auditLog('settings', 'update'), settingsController.updateContactInfo);
router.put('/social-links', protect, authorize('admin'), auditLog('settings', 'update'), settingsController.updateSocialLinks);
router.put('/seo', protect, authorize('admin'), auditLog('settings', 'update'), settingsController.updateSEO);
router.put('/store', protect, authorize('admin'), auditLog('settings', 'update'), settingsController.updateStoreSettings);
router.put('/navbar', protect, authorize('admin'), auditLog('settings', 'update'), settingsController.updateNavbar);
router.put('/footer', protect, authorize('admin'), auditLog('settings', 'update'), settingsController.updateFooter);
router.put('/announcement', protect, authorize('admin'), auditLog('settings', 'update'), settingsController.updateAnnouncement);
router.get('/homepage', protect, authorize('admin'), settingsController.getHomepage);
router.put('/homepage', protect, authorize('admin'), auditLog('settings', 'update'), settingsController.updateHomepage);

export default router;
