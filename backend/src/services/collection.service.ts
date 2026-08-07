import { CollectionRepository } from '../repositories/collection.repository';
import { ProductRepository } from '../repositories/product.repository';
import { CouponModel } from '../models/Coupon';
import { ICollection } from 'shared/types';
import { Types } from 'mongoose';
import { AppError, NotFoundError } from '../utils/exceptions';

export class CollectionService {
  constructor(
    private collectionRepo: CollectionRepository,
    private productRepo: ProductRepository
  ) {}

  async getCollections(filter: any = {}, options: any = {}): Promise<any> {
    return this.collectionRepo.paginate(filter, options);
  }

  async getCollectionById(id: string): Promise<ICollection> {
    const collection = await this.collectionRepo.findById(id);
    if (!collection) {
      throw new AppError('Collection not found', 404);
    }
    return this.attachProductCount(collection);
  }

  async getCollectionBySlug(slug: string): Promise<ICollection> {
    const collection = await this.collectionRepo.findBySlug(slug);
    if (!collection) {
      throw new AppError('Collection not found', 404);
    }
    return this.attachProductCount(collection);
  }

  async getCollectionProducts(collectionIdOrSlug: string, options: any = {}): Promise<any> {
    // Accept either a Mongo id or a slug; products are matched through the
    // `collections` array on the Product document (OR / $in semantics).
    const isObjectId = Types.ObjectId.isValid(collectionIdOrSlug);
    const collection = isObjectId
      ? await this.collectionRepo.findById(collectionIdOrSlug)
      : await this.collectionRepo.findBySlug(collectionIdOrSlug);
    if (!collection) {
      throw new AppError('Collection not found', 404);
    }

    return this.productRepo.paginate(
      { collections: { $in: [collection.slug] }, status: 'active' },
      options
    );
  }

  async getFeaturedCollections(limit: number = 3): Promise<ICollection[]> {
    const collections = await this.collectionRepo.findMany(
      { featured: true, isActive: true },
      { sort: { sortOrder: 1, createdAt: -1 }, limit }
    );
    return this.attachProductCounts(collections);
  }

  async getCurrentCollections(): Promise<ICollection[]> {
    const now = new Date();
    const collections = await this.collectionRepo.findMany(
      { 
        isActive: true,
        $or: [
          { startDate: { $exists: false } },
          { startDate: { $lte: now } }
        ],
        $and: [
          {
            $or: [
              { endDate: { $exists: false } },
              { endDate: { $gte: now } }
            ]
          }
        ]
      },
      { sort: { sortOrder: 1, createdAt: -1 } }
    );
    return this.attachProductCounts(collections);
  }

  async getCollectionCount(): Promise<number> {
    return this.collectionRepo.count({ isActive: true });
  }

  async getUpcomingCollections(): Promise<ICollection[]> {
    const now = new Date();
    return this.collectionRepo.findMany(
      { 
        isActive: true,
        startDate: { $gt: now }
      },
      { sort: { startDate: 1 } }
    );
  }

  async createCollection(data: Partial<ICollection>): Promise<ICollection> {
    return this.collectionRepo.create(data);
  }

  async updateCollection(id: string, data: Partial<ICollection>): Promise<ICollection> {
    const updated = await this.collectionRepo.updateById(id, data);
    if (!updated) {
      throw new NotFoundError('Collection not found');
    }
    return updated;
  }

  async deleteCollection(id: string): Promise<boolean> {
    const collection = await this.collectionRepo.findById(id);
    if (!collection) {
      throw new NotFoundError('Collection not found');
    }

    // Remove this collection's slug from every product that carries it —
    // products disappear from the section automatically, nothing else breaks.
    await this.productRepo.updateMany(
      { collections: collection.slug },
      { $pull: { collections: collection.slug } }
    );

    // Pull the collection out of any coupon collection scopes
    await CouponModel.updateMany(
      { collectionIds: collection._id },
      { $pull: { collectionIds: collection._id } }
    );

    return this.collectionRepo.deleteById(id);
  }

  async attachProductCounts(collections: ICollection[]): Promise<ICollection[]> {
    if (collections.length === 0) return collections;

    // Single aggregation instead of one count query per collection (N+1).
    const slugs = collections.map((c) => c.slug);
    const counts = await this.productRepo.aggregate([
      { $match: { collections: { $in: slugs }, status: 'active' } },
      { $unwind: '$collections' },
      { $match: { collections: { $in: slugs } } },
      { $group: { _id: '$collections', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((row: any) => [String(row._id), row.count]));
    return collections.map((c) => {
      const doc = (c as any).toObject ? (c as any).toObject() : c;
      return { ...doc, productCount: countMap.get(String(c.slug)) ?? 0 };
    });
  }

  private async attachProductCount(collection: ICollection): Promise<ICollection> {
    const count = await this.productRepo.count({ collections: collection.slug, status: 'active' });
    return { ...(collection as any).toObject ? (collection as any).toObject() : collection, productCount: count };
  }
}
