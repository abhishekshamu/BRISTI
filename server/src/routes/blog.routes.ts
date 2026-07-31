import { Router } from 'express';
import { BlogController } from '../controllers/blog.controller';
import { BlogService } from '../services/blog.service';
import { BlogRepository } from '../repositories/blog.repository';
import { protect, authorize } from '../middleware/auth.middleware';

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
router.get('/:id', blogController.getBlogPostById);
router.get('/slug/:slug', blogController.getBlogPostBySlug);

router.post('/', protect, authorize('admin'), blogController.createBlogPost);
router.put('/:id', protect, authorize('admin'), blogController.updateBlogPost);
router.delete('/:id', protect, authorize('admin'), blogController.deleteBlogPost);
router.get('/stats/blog', protect, authorize('admin'), blogController.getBlogStats);

export default router;
