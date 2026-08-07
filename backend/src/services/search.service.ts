import { ProductRepository } from '../repositories/product.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CollectionRepository } from '../repositories/collection.repository';
import { BlogRepository } from '../repositories/blog.repository';
import { PageRepository } from '../repositories/page.repository';
import { OrderRepository } from '../repositories/order.repository';
import { UserRepository } from '../repositories/user.repository';

export class SearchService {
  constructor(
    private productRepo: ProductRepository,
    private categoryRepo: CategoryRepository,
    private collectionRepo: CollectionRepository,
    private blogRepo: BlogRepository,
    private pageRepo: PageRepository,
    private orderRepo: OrderRepository,
    private userRepo: UserRepository
  ) {}

  async globalSearch(query: string, options: { limit?: number; includeAdmin?: boolean } = {}): Promise<any> {
    const q = query.trim();
    if (!q) {
      return { products: [], categories: [], collections: [], blogPosts: [], pages: [], orders: [], users: [] };
    }

    const limit = options.limit ?? 5;
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [products, categories, collections, blogPosts, pages, orders, users] = await Promise.all([
      this.productRepo.search(q, { limit }),
      this.categoryRepo.findMany({ $or: [{ name: regex }, { description: regex }], isActive: true }, { limit }),
      this.collectionRepo.findMany({ $or: [{ name: regex }, { description: regex }], isActive: true }, { limit }),
      this.blogRepo.search(q, { limit }),
      this.pageRepo.findMany({ $or: [{ title: regex }, { content: regex }] }, { limit }),
      options.includeAdmin
        ? this.orderRepo.findMany({ $or: [{ orderNumber: regex }, { 'shippingAddress.name': regex }] }, { limit })
        : Promise.resolve([]),
      options.includeAdmin
        ? this.userRepo.findMany({ $or: [{ firstName: regex }, { lastName: regex }, { email: regex }] }, { limit })
        : Promise.resolve([]),
    ]);

    return { products, categories, collections, blogPosts, pages, orders, users };
  }
}
