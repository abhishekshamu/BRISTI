import { CollectionRepository } from '../repositories/collection.repository';
import { ProductRepository } from '../repositories/product.repository';
import { ICollection } from 'shared/types';

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
      throw new Error('Collection not found');
    }
    return collection;
  }

  async getCollectionBySlug(slug: string): Promise<ICollection> {
    const collection = await this.collectionRepo.findBySlug(slug);
    if (!collection) {
      throw new Error('Collection not found');
    }
    return collection;
  }

  async getCollectionProducts(collectionId: string, options: any = {}): Promise<any> {
    // Verify collection exists
    const collection = await this.collectionRepo.findById(collectionId);
    if (!collection) {
      throw new Error('Collection not found');
    }
    
    // Get products in collection
    return this.productRepo.paginate(
      { collection: collectionId, status: 'active' },
      options
    );
  }

  async getFeaturedCollections(limit: number = 3): Promise<ICollection[]> {
    return this.collectionRepo.findMany(
      { featured: true, isActive: true },
      { sort: { sortOrder: 1, createdAt: -1 }, limit }
    );
  }

  async getCurrentCollections(): Promise<ICollection[]> {
    const now = new Date();
    return this.collectionRepo.findMany(
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
      { sort: { createdAt: -1 } }
    );
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
      throw new Error('Collection not found');
    }
    return updated;
  }

  async deleteCollection(id: string): Promise<boolean> {
    const collection = await this.collectionRepo.findById(id);
    if (!collection) {
      throw new Error('Collection not found');
    }

    // Unassign products from this collection (keep products, drop the link)
    await this.productRepo.updateMany(
      { collection: id },
      { $unset: { collection: 1 } }
    );

    return this.collectionRepo.deleteById(id);
  }
}
