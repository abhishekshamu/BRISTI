import { Router } from 'express';
import { BlogController } from '../controllers/blog.controller';
import { BlogService } from '../services/blog.service';
import { BlogRepository } from '../repositories/blog.repository';
import { protect, authorize, optionalAuth } from '../middleware/auth.middleware';
import { auditLog } from '../middleware/audit.middleware';
import { createBlogPostValidation, updateBlogPostValidation } from '../validators/blog.validators';
import { validateRequest } from '../validators';

const blogRepo = new BlogRepository();
const blogService = new BlogService(blogRepo);
const blogController = new BlogController(blogService);

const router = Router();

router.get('/', blogController.getPublishedBlogPosts);
router.get('/featured', blogController.getFeaturedPosts);
router.get('/recent', blogController.getRecentPosts);
router.get('/search', blogController.searchPosts);
router.get('/tag/:tag', blogController.getPostsByTag);
router.get('/related/:postId', blogController.getRelatedPosts);
router.get('/stats/blog', protect, authorize('admin'), blogController.getBlogStats);
router.get('/all', protect, authorize('admin'), blogController.getBlogPosts);
router.get('/:id', optionalAuth, blogController.getBlogPostById);
router.get('/slug/:slug', optionalAuth, blogController.getBlogPostBySlug);

router.post('/', protect, authorize('admin'), auditLog('blog', 'create'), createBlogPostValidation, validateRequest, blogController.createBlogPost);
router.put('/:id', protect, authorize('admin'), auditLog('blog', 'update'), updateBlogPostValidation, validateRequest, blogController.updateBlogPost);
router.delete('/:id', protect, authorize('admin'), auditLog('blog', 'delete'), blogController.deleteBlogPost);

export default router;
