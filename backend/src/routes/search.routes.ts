import { Router } from 'express';
import { SearchService } from '../services/search.service';
import { ProductRepository } from '../repositories/product.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CollectionRepository } from '../repositories/collection.repository';
import { BlogRepository } from '../repositories/blog.repository';
import { PageRepository } from '../repositories/page.repository';
import { OrderRepository } from '../repositories/order.repository';
import { UserRepository } from '../repositories/user.repository';
import { optionalAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/async';

const searchService = new SearchService(
  new ProductRepository(),
  new CategoryRepository(),
  new CollectionRepository(),
  new BlogRepository(),
  new PageRepository(),
  new OrderRepository(),
  new UserRepository()
);

const router = Router();

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req: any, res: any) => {
    const q = (req.query.q || '').toString();
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 5;
    const isAdmin = !!(req.user && (req.user.role === 'admin' || req.user.role === 'super_admin'));
    const results = await searchService.globalSearch(q, { limit, includeAdmin: isAdmin });
    res.status(200).json({ success: true, data: results });
  })
);

export default router;
