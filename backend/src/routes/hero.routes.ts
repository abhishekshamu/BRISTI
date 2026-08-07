import { Router } from 'express';
import { HeroController } from '../controllers/hero.controller';
import { HeroService } from '../services/hero.service';
import { protect, authorize } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { validate } from '../validators/index';
import { createHeroValidation, updateHeroValidation, heroIdValidation } from '../validators/hero.validators';

const router = Router();
const heroController = new HeroController(new HeroService());

// Public: active published blocks for the storefront hero
router.get('/', heroController.getActiveBlocks);

// Public: SSE stream — pushes a change event whenever a hero set is written
router.get('/events', heroController.streamEvents);

// Admin routes
router.get('/all', protect, authorize('admin'), heroController.getAllBlocks);
router.post('/', protect, authorize('admin'), auditLog('hero', 'create'), createHeroValidation, validate, heroController.createBlock);
router.post('/reorder', protect, authorize('admin'), auditLog('hero', 'reorder'), heroController.reorderBlocks);
router.get('/:id', protect, authorize('admin'), heroIdValidation, validate, heroController.getBlockById);
router.put('/:id', protect, authorize('admin'), auditLog('hero', 'update'), updateHeroValidation, validate, heroController.updateBlock);
router.delete('/:id', protect, authorize('admin'), auditLog('hero', 'delete'), heroIdValidation, validate, heroController.deleteBlock);
router.post('/:id/duplicate', protect, authorize('admin'), auditLog('hero', 'duplicate'), heroIdValidation, validate, heroController.duplicateBlock);

export default router;
