import { ProductRepository } from '../repositories/product.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CollectionRepository } from '../repositories/collection.repository';
import { ReviewRepository } from '../repositories/review.repository';
import { InventoryItemRepository } from '../repositories/inventory-item.repository';
import { WishlistRepository } from '../repositories/wishlist.repository';
import { CartRepository } from '../repositories/cart.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { NotificationService } from './notification.service';
import { notifyAdmins } from './admin-notifier';
import { ProductModel } from '../models/Product';
import { IProduct, IReview } from 'shared/types';
import { NotFoundException, BadRequestException } from '../utils/exceptions';

export class ProductService {
  constructor(
    private productRepo: ProductRepository,
    private categoryRepo: CategoryRepository,
    private collectionRepo: CollectionRepository,
    private reviewRepo: ReviewRepository,
    private inventoryRepo: InventoryItemRepository,
    private wishlistRepo: WishlistRepository,
    private cartRepo: CartRepository,
    private couponRepo: CouponRepository,
    private notificationService: NotificationService
  ) {}

  private async syncCategoryCount(categoryId: any): Promise<void> {
    if (!categoryId) return;
    const count = await this.productRepo.count({ category: categoryId, status: 'active' });
    await this.categoryRepo.updateById(categoryId.toString(), { productCount: count });
  }

  private async syncInventory(product: any): Promise<void> {
    await this.inventoryRepo.upsertByProduct(product);
  }

  private async checkLowStock(product: any): Promise<void> {
    if (!product.trackQuantity) return;
    const totalStock = product.variants && product.variants.length > 0
      ? product.variants.reduce((sum: number, v: any) => sum + (v.stock ?? 0), 0)
      : product.stock;
    if (totalStock <= (product.lowStockThreshold ?? 5)) {
      await notifyAdmins(this.notificationService, {
        title: 'Low Stock Alert',
        message: `${product.name} has only ${totalStock} unit(s) left.`,
        type: 'warning',
        relatedId: product._id,
        relatedType: 'Product',
      });
    }
  }

  async createProduct(productData: Partial<IProduct>): Promise<IProduct> {
    if (productData.category) {
      const categoryExists = await this.categoryRepo.exists({ _id: productData.category });
      if (!categoryExists) {
        throw new BadRequestException('Category not found');
      }
    }

    if (productData.collection) {
      const collectionExists = await this.collectionRepo.exists({ _id: productData.collection });
      if (!collectionExists) {
        throw new BadRequestException('Collection not found');
      }
    }

    if (!productData.slug && productData.name) {
      productData.slug = this.generateSlug(productData.name);
    }
    if (productData.slug && await this.productRepo.findBySlug(productData.slug)) {
      throw new BadRequestException('Product slug already exists');
    }
    if (productData.sku && await this.productRepo.findBySku(productData.sku)) {
      throw new BadRequestException('Product SKU already exists');
    }

    // Keep collection.products array in sync when a collection is assigned
    if (productData.collection) {
      await this.collectionRepo.updateById(productData.collection.toString(), {
        $addToSet: { products: productData._id ? productData._id : undefined },
      }).catch(() => undefined);
    }

    const product = await this.productRepo.create(productData);

    // Sync inventory ledger + category count + low-stock alert
    await this.syncInventory(product);
    await this.syncCategoryCount(productData.category);
    if (productData.collection) {
      await this.collectionRepo.updateById(productData.collection.toString(), {
        $addToSet: { products: product._id },
      }).catch(() => undefined);
    }
    await this.checkLowStock(product);

    return product;
  }

  async getProductById(productId: string): Promise<IProduct> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async getProductBySlug(slug: string): Promise<IProduct> {
    const product = await this.productRepo.findBySlug(slug);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async updateProduct(productId: string, updateData: Partial<IProduct>): Promise<IProduct> {
    const existing = await this.productRepo.findById(productId);
    if (!existing) {
      throw new NotFoundException('Product not found');
    }

    if (updateData.category) {
      const categoryExists = await this.categoryRepo.exists({ _id: updateData.category });
      if (!categoryExists) {
        throw new BadRequestException('Category not found');
      }
    }

    if (updateData.collection) {
      const collectionExists = await this.collectionRepo.exists({ _id: updateData.collection });
      if (!collectionExists) {
        throw new BadRequestException('Collection not found');
      }
    }

    if (updateData.name && !updateData.slug) {
      updateData.slug = this.generateSlug(updateData.name);
    }
    if (updateData.slug) {
      const matchingProduct = await this.productRepo.findBySlug(updateData.slug);
      if (matchingProduct && String((matchingProduct as any)._id) !== productId) throw new BadRequestException('Product slug already exists');
    }

    const updatedProduct = await this.productRepo.updateById(productId, updateData);
    if (!updatedProduct) {
      throw new NotFoundException('Product not found');
    }

    // Keep everything synchronized: inventory, category counts (old + new), collections, low stock
    await this.syncInventory(updatedProduct);
    await this.syncCategoryCount(existing.category);
    await this.syncCategoryCount(updatedProduct.category);
    await this.syncCollections(existing, updatedProduct);
    await this.checkLowStock(updatedProduct);

    return updatedProduct;
  }

  private async syncCollections(existing: any, updated: any): Promise<void> {
    const oldCollection = existing.collection ? existing.collection.toString() : null;
    const newCollection = updated.collection ? updated.collection.toString() : null;

    if (oldCollection && oldCollection !== newCollection) {
      await this.collectionRepo.updateById(oldCollection, { $pull: { products: existing._id } });
    }
    if (newCollection && oldCollection !== newCollection) {
      await this.collectionRepo.updateById(newCollection, { $addToSet: { products: existing._id } });
    }
  }

  async deleteProduct(productId: string): Promise<boolean> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Cascade cleanup: reviews, cart items, wishlists, coupons, collections, inventory
    await this.reviewRepo.deleteMany({ productId });
    await this.cartRepo.deleteMany({ 'items.productId': productId });
    await this.wishlistRepo.deleteMany({ productId });
    await this.couponRepo.updateMany(
      { productIds: productId },
      { $pull: { productIds: productId } }
    );
    await this.collectionRepo.updateMany(
      { products: productId },
      { $pull: { products: productId } }
    );
    await this.inventoryRepo.deleteMany({ productId });

    const deleted = await this.productRepo.deleteById(productId);
    if (!deleted) {
      throw new NotFoundException('Product not found');
    }

    await this.syncCategoryCount(product.category);

    return true;
  }

  async getProducts(options: any = {}): Promise<any> {
    const filter: any = { status: 'active' };
    const paginateOptions: any = { ...options };
    if (options.category) filter.category = options.category;
    if (options.collection) filter.collection = options.collection;
    if (options.featured !== undefined) filter.featured = options.featured;
    if (options.minPrice !== undefined) filter.price = { ...filter.price, $gte: options.minPrice };
    if (options.maxPrice !== undefined) filter.price = { ...filter.price, $lte: options.maxPrice };
    delete paginateOptions.category;
    delete paginateOptions.collection;
    delete paginateOptions.featured;
    delete paginateOptions.minPrice;
    delete paginateOptions.maxPrice;
    return this.productRepo.paginate(filter, paginateOptions);
  }

  async getFeaturedProducts(limit: number = 10): Promise<IProduct[]> {
    return this.productRepo.findFeatured(limit);
  }

  async getNewArrivals(limit: number = 10): Promise<IProduct[]> {
    return this.productRepo.findNewArrivals(limit);
  }

  async getOnSaleProducts(limit: number = 10): Promise<IProduct[]> {
    return this.productRepo.findOnSale(limit);
  }

  async getBestSellers(limit: number = 10): Promise<IProduct[]> {
    return this.productRepo.findBestSellers(limit);
  }

  async getTrendingProducts(limit: number = 10): Promise<IProduct[]> {
    return this.productRepo.findTrending(limit);
  }

  async getRelatedProducts(productId: string, limit: number = 4): Promise<IProduct[]> {
    const product = await this.productRepo.findById(productId);
    if (!product || !product.category) {
      return [];
    }
    return this.productRepo.findMany(
      {
        category: product.category,
        _id: { $ne: product._id },
        status: 'active',
      },
      { sort: { 'rating.average': -1 }, limit }
    );
  }

  async searchProducts(query: string, options: any = {}): Promise<IProduct[]> {
    return this.productRepo.search(query, options);
  }

  async getProductsByCategory(categoryId: string, options: any = {}): Promise<any> {
    return this.productRepo.paginate({ category: categoryId, status: 'active' }, options);
  }

  async getProductsByCollection(collectionId: string, options: any = {}): Promise<any> {
    return this.productRepo.paginate({ collection: collectionId, status: 'active' }, options);
  }

  async getProductReviews(productId: string, options: any = {}): Promise<any> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.reviewRepo.findByProductId(productId, options);
  }

  async addProductReview(productId: string, userId: string, reviewData: Partial<IReview>): Promise<IReview> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existingReview = await this.reviewRepo.findByProductAndUser(productId, userId);
    if (existingReview) {
      throw new BadRequestException('You have already reviewed this product');
    }

    const review = await this.reviewRepo.create({
      ...reviewData,
      productId,
      userId,
    });

    // Recompute product rating from approved reviews
    await this.recomputeRating(productId);

    return review;
  }

  async recomputeRating(productId: string): Promise<void> {
    const stats = await this.reviewRepo.getApprovedRatingStats(productId);
    await this.productRepo.updateById(productId, { rating: stats });
  }

  async updateProductStock(productId: string, quantity: number): Promise<IProduct> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.productRepo.updateById(productId, {
      stock: Math.max(0, quantity),
    });

    await this.syncInventory(updated);
    await this.checkLowStock(updated);

    return updated;
  }

  private generateSlug(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }
}
