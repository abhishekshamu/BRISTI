import { Router } from 'express';
import { PageController } from '../controllers/page.controller';
import { PageService } from '../services/page.service';
import { PageRepository } from '../repositories/page.repository';
import { protect, authorize } from '../middleware/auth.middleware';

const pageRepo = new PageRepository();
const pageService = new PageService(pageRepo);
const pageController = new PageController(pageService);

const router = Router();

router.get('/', pageController.getPages);
router.get('/menu', pageController.getMenuPages);
router.get('/slug/:slug', pageController.getPublishedPageBySlug);
router.get('/:id', pageController.getPageById);

router.post('/', protect, authorize('admin'), pageController.createPage);
router.put('/:id', protect, authorize('admin'), pageController.updatePage);
router.put('/:id/builder', protect, authorize('admin'), pageController.updateBuilder);
router.delete('/:id', protect, authorize('admin'), pageController.deletePage);

export default router;
