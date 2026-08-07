import { Router } from 'express';
import { PageController } from '../controllers/page.controller';
import { PageService } from '../services/page.service';
import { PageRepository } from '../repositories/page.repository';
import { protect, authorize, optionalAuth } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { createPageValidation, updatePageValidation, updatePageBuilderValidation } from '../validators/page.validators';
import { validateRequest } from '../validators';

const pageRepo = new PageRepository();
const pageService = new PageService(pageRepo);
const pageController = new PageController(pageService);

const router = Router();

router.get('/', pageController.getPages);
router.get('/menu', pageController.getMenuPages);
router.get('/slug/:slug', pageController.getPublishedPageBySlug);
router.get('/:id', optionalAuth, pageController.getPageById);

router.post('/', protect, authorize('admin'), auditLog('page', 'create'), createPageValidation, validateRequest, pageController.createPage);
router.put('/:id', protect, authorize('admin'), auditLog('page', 'update'), updatePageValidation, validateRequest, pageController.updatePage);
router.put('/:id/builder', protect, authorize('admin'), auditLog('page', 'update'), updatePageBuilderValidation, validateRequest, pageController.updateBuilder);
router.delete('/:id', protect, authorize('admin'), auditLog('page', 'delete'), pageController.deletePage);

export default router;
