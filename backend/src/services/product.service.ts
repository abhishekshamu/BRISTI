import { ProductRepository } from '../repositories/product.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CollectionRepository } from '../repositories/collection.repository';
import { ReviewRepository } from '../repositories/review.repository';
import { InventoryItemRepository } from '../repositories/inventory-item.repository';
import { WishlistRepository } from '../repositories/wishlist.repository';
import { CartRepository } from '../repositories/cart.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { MediaRepository } from '../repositories/media.repository';
import { NotificationService } from './notification.service';
import { notifyAdmins } from './admin-notifier';
import { UserModel } from '../models/User';
import { IProduct, IReview } from '../../shared/types';
import { Types } from 'mongoose';
import { NotFoundException, BadRequestException } from '../utils/exceptions';
import { normalizeSeo } from '../utils/seo';

// Query param name → product field. Every marketing list has an independent
// boolean on the product; filters are combinable (AND).
const FLAG_FILTER_MAP: Record<string, string> = {
  newArrival: 'isNewArrival',
  bestSeller: 'isBestSeller',
  trending: 'isTrending',
  sale: 'isOnSale',
  featured: 'isFeatured',
  recommended: 'isRecommended',
  exclusive: 'isExclusive',
  limitedEdition: 'isLimitedEdition',
  editorsPick: 'isEditorsPick',
  premiumCollection: 'isPremiumCollection',
};

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
    private notificationService: NotificationService,
    private mediaRepo: MediaRepository = new MediaRepository()
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
    productData = normalizeSeo(productData);
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

    // Validate every marketing collection slug exists in the CMS
    if (productData.collections?.length) {
      const valid = await this.collectionRepo.exists({ slug: { $in: productData.collections } });
      const count = await this.collectionRepo.count({ slug: { $in: productData.collections } });
      if (!valid || count !== new Set(productData.collections).size) {
        throw new BadRequestException('One or more collections do not exist');
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
    updateData = normalizeSeo(updateData);
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

    if (updateData.collections?.length) {
      const count = await this.collectionRepo.count({ slug: { $in: updateData.collections } });
      if (count !== new Set(updateData.collections).size) {
        throw new BadRequestException('One or more collections do not exist');
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
    // Wishlist stores ids in a `productIds` array — target that field
    await this.wishlistRepo.deleteMany({ productIds: productId });
    // Also pull the id from users' embedded wishlist arrays
    await UserModel.updateMany({ wishlist: productId }, { $pull: { wishlist: productId } });
    // Also pull the id from users' embedded wishlist arrays and carts
    await this.couponRepo.updateMany(
      { productIds: productId },
      { $pull: { productIds: productId } }
    );
    await this.collectionRepo.updateMany(
      { products: productId },
      { $pull: { products: productId } }
    );
    await this.inventoryRepo.deleteMany({ productId });

    // Cascade the product's own media library entries (URL-matched) so
    // deleted products do not leave orphaned MediaFile documents behind.
    const mediaUrls = [
      ...(product.images ?? []).map((img: any) => img?.url),
      ...(product.videos ?? []).map((v: any) => v?.url),
      ...(product.videos ?? []).map((v: any) => v?.thumbnail),
    ].filter(Boolean);
    if (mediaUrls.length > 0) {
      await this.mediaRepo.deleteMany({ url: { $in: mediaUrls } });
      await this.mediaRepo.deleteMany({ thumbnailUrl: { $in: mediaUrls } });
    }

    const deleted = await this.productRepo.deleteById(productId);
    if (!deleted) {
      throw new NotFoundException('Product not found');
    }

    await this.syncCategoryCount(product.category);

    return true;
  }

  async getProducts(options: any = {}): Promise<any> {
    const filter: any = {};
    // Storefront defaults to live products only; an explicit `status` param
    // (used by the admin product manager) overrides that. `status=all` from
    // the admin list shows every status including draft/archived.
    if (options.status && options.status !== 'all') filter.status = options.status;
    else if (!options.status) filter.status = 'active';
    const paginateOptions: any = { ...options };
    // Multi-category support (OR semantics): `category` and/or `categories`
    // may be a single value, a comma-separated list, or a repeated query
    // param (array). Values may be category _ids or slugs — both are
    // resolved into _ids and applied as a single $in (union) filter. A
    // product only ever belongs to one category, so $in is the only
    // correct semantic.
    const categoryValues = this.collectListParam(options.category).concat(
      this.collectListParam(options.categories)
    );
    if (categoryValues.length > 0) {
      const categoryIds = await this.resolveCategoryIds(categoryValues);
      // $in: [] matches nothing, so a stale/unknown slug yields an empty
      // (but valid) result instead of falling back to "all products".
      filter.category = categoryIds.length > 1 ? { $in: categoryIds } : categoryIds.length === 1 ? categoryIds[0] : { $in: [] };
    }
    if (options.collections) {
      const collectionList = Array.isArray(options.collections)
        ? options.collections
        : String(options.collections)
            .split(',')
            .map((slug: string) => slug.trim())
            .filter(Boolean);
      filter.collections = collectionList.length > 1 ? { $in: collectionList } : collectionList[0];
    }
    if (options.collection) filter.collection = options.collection;
    // Independent marketing flags (combinable). Each param maps to a product
    // boolean field; multiple flags AND together. Accepts true/false/1/0.
    for (const [param, field] of Object.entries(FLAG_FILTER_MAP)) {
      const value = options[param];
      if (value === undefined || value === null) continue;
      const enabled = String(value).toLowerCase();
      if (enabled === 'true' || enabled === '1') filter[field] = true;
      else if (enabled === 'false' || enabled === '0') filter[field] = false;
    }
    if (options.minPrice !== undefined) filter.price = { ...filter.price, $gte: options.minPrice };
    if (options.maxPrice !== undefined) filter.price = { ...filter.price, $lte: options.maxPrice };
    // Server-side search (name / description / tags / sku) — the admin
    // product list searches across all pages, not just the current one.
    if (options.search) {
      const re = new RegExp(String(options.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { name: { $regex: re } },
        { description: { $regex: re } },
        { tags: { $regex: re } },
        { sku: { $regex: re } },
      ];
    }
    for (const param of Object.keys(FLAG_FILTER_MAP)) delete paginateOptions[param];
    delete paginateOptions.category;
    delete paginateOptions.categories;
    delete paginateOptions.collection;
    delete paginateOptions.collections;
    delete paginateOptions.featured;
    delete paginateOptions.status;
    delete paginateOptions.search;
    delete paginateOptions.minPrice;
    delete paginateOptions.maxPrice;
    return this.productRepo.paginate(filter, paginateOptions);
  }

  // Splits a query param into a list of values regardless of whether it
  // arrived as a single string, a comma-separated string, or a repeated
  // (array) param. Values are URL-decoded, trimmed and lowercased.
  private collectListParam(value: any): string[] {
    if (value === undefined || value === null) return [];
    const rawList = Array.isArray(value) ? value : String(value);
    const list = Array.isArray(rawList) ? rawList : [rawList];
    const values: string[] = [];
    for (const item of list) {
      for (const part of String(item).split(',')) {
        const cleaned = this.normalizeCategoryValue(part);
        if (cleaned) values.push(cleaned);
      }
    }
    return values;
  }

  private normalizeCategoryValue(value: string): string {
    let cleaned = value.trim().toLowerCase();
    try {
      cleaned = decodeURIComponent(cleaned);
    } catch {
      // already decoded or not encodable — keep as-is
    }
    cleaned = cleaned.trim();
    return cleaned;
  }

  // Accepts a mix of category _ids and slugs; slugs are resolved to _ids
  // server-side so the client never needs to know category ids.
  private async resolveCategoryIds(values: string[]): Promise<string[]> {
    const ids = new Set<string>();
    const slugCandidates: string[] = [];
    for (const value of values) {
      if (Types.ObjectId.isValid(value)) {
        ids.add(value);
      } else {
        slugCandidates.push(value);
      }
    }
    if (slugCandidates.length > 0) {
      const matches = await this.categoryRepo.findMany({ slug: { $in: slugCandidates } });
      for (const match of matches) ids.add(String(match._id));
    }
    return Array.from(ids);
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

  async getByIds(ids: string[]): Promise<IProduct[]> {
    return this.productRepo.findByIds(ids);
  }

  async searchProducts(query: string, options: any = {}): Promise<IProduct[]> {
    const searchOptions: any = { ...options };
    const collectionFilter: any = {};
    if (options.collections) {
      const collectionList = Array.isArray(options.collections)
        ? options.collections
        : String(options.collections)
            .split(',')
            .map((slug: string) => slug.trim())
            .filter(Boolean);
      collectionFilter.collections = collectionList.length > 1 ? { $in: collectionList } : collectionList[0];
    }
    delete searchOptions.collections;
    return this.productRepo.searchWithFilter(query, searchOptions, collectionFilter);
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
