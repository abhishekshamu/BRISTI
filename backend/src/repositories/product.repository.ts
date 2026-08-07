import { ProductModel } from '../models/Product';
import { BaseRepository } from './base.repository';
import { IProduct } from 'shared/types';
import { Types } from 'mongoose';

export class ProductRepository extends BaseRepository<any> {
  constructor() {
    super(ProductModel);
  }

  async findBySlug(slug: string): Promise<IProduct | null> {
    return this.findOne({ slug });
  }

  async findBySku(sku: string): Promise<IProduct | null> {
    return this.findOne({ sku });
  }

  async findActive(options: any = {}): Promise<IProduct[]> {
    return this.findMany({ status: 'active' }, options);
  }

  async findFeatured(limit: number = 10): Promise<IProduct[]> {
    return this.findMany(
      { isFeatured: true, status: 'active' },
      { sort: { createdAt: -1 }, limit }
    );
  }

  async findNewArrivals(limit: number = 10): Promise<IProduct[]> {
    return this.findMany(
      { isNewArrival: true, status: 'active' },
      { sort: { createdAt: -1 }, limit }
    );
  }

  async findOnSale(limit: number = 10): Promise<IProduct[]> {
    return this.findMany(
      { isOnSale: true, status: 'active' },
      { sort: { createdAt: -1 }, limit }
    );
  }

  async findBestSellers(limit: number = 10): Promise<IProduct[]> {
    return this.findMany(
      { isBestSeller: true, status: 'active' },
      { sort: { 'rating.count': -1, 'rating.average': -1 }, limit }
    );
  }

  async findTrending(limit: number = 10): Promise<IProduct[]> {
    return this.findMany(
      { isTrending: true, status: 'active' },
      { sort: { 'rating.average': -1, 'rating.count': -1 }, limit }
    );
  }

  async findByCategory(categoryId: string, options: any = {}): Promise<IProduct[]> {
    return this.findMany(
      { 
        category: categoryId,
        status: 'active'
      },
      options
    );
  }

  async findByCollection(collectionId: string, options: any = {}): Promise<IProduct[]> {
    return this.findMany(
      { 
        collection: collectionId,
        status: 'active'
      },
      options
    );
  }

  async findByIds(ids: string[], options: any = {}): Promise<IProduct[]> {
    return this.findMany(
      { _id: { $in: ids }, status: 'active' },
      options
    );
  }

  async search(query: string, options: any = {}): Promise<IProduct[]> {
    const searchRegex = new RegExp(this.escapeRegex(query), 'i');
    return this.findMany(
      {
        $or: [
          { name: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { tags: { $regex: searchRegex } },
          { sku: { $regex: searchRegex } }
        ],
        status: 'active'
      },
      options
    );
  }

  async searchWithFilter(query: string, options: any = {}, extraFilter: any = {}): Promise<IProduct[]> {
    const searchRegex = new RegExp(this.escapeRegex(query), 'i');
    // Search results keep the array response envelope the storefront expects;
    // `page` is honored via skip so deep pages actually advance.
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const cleanOptions: any = { ...options };
    delete cleanOptions.page;
    delete cleanOptions.limit;
    return this.findMany(
      {
        $and: [
          {
            $or: [
              { name: { $regex: searchRegex } },
              { description: { $regex: searchRegex } },
              { tags: { $regex: searchRegex } },
              { sku: { $regex: searchRegex } }
            ]
          },
          extraFilter,
          { status: 'active' }
        ]
      },
      { ...cleanOptions, skip: (page - 1) * limit, limit }
    );
  }

  private escapeRegex(text: string): string {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async getProductWithRelations(productId: string): Promise<any> {
    return this.model.aggregate([
      { $match: { _id: new Types.ObjectId(productId) } },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $lookup: {
          from: 'collections',
          localField: 'collection',
          foreignField: '_id',
          as: 'collection'
        }
      },
      {
        $unwind: { path: '$category', preserveNullAndEmptyArrays: true }
      },
      {
        $unwind: { path: '$collection', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          __v: 0,
          'category.__v': 0,
          'collection.__v': 0
        }
      }
    ]).exec();
  }

  async updateStock(productId: string, quantity: number): Promise<IProduct | null> {
    return this.findByIdAndUpdate(
      productId,
      { 
        $inc: { stock: quantity },
        $set: { updatedAt: new Date() }
      },
      { new: true }
    );
  }

  async updateRating(productId: string): Promise<IProduct | null> {
    // This would typically be done via aggregation pipeline
    // For simplicity, we're just returning the product
    // In a real implementation, you'd calculate the average rating from reviews
    return this.findById(productId);
  }
}
