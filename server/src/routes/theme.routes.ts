import { Router } from 'express';
import { ThemeController } from '../controllers/theme.controller';
import { ThemeService } from '../services/theme.service';
import { ThemeRepository } from '../repositories/theme.repository';
import { protect, authorize } from '../middleware/auth.middleware';

const themeRepo = new ThemeRepository();
const themeService = new ThemeService(themeRepo);
const themeController = new ThemeController(themeService);

const router = Router();

router.get('/', themeController.getActiveTheme);
router.get('/all', protect, authorize('admin'), themeController.getAllThemes);
router.get('/:id', protect, authorize('admin'), themeController.getThemeById);

router.post('/', protect, authorize('admin'), themeController.createTheme);
router.put('/:id', protect, authorize('admin'), themeController.updateTheme);
router.delete('/:id', protect, authorize('admin'), themeController.deleteTheme);
router.put('/:id/activate', protect, authorize('admin'), themeController.setActiveTheme);

export default router;
