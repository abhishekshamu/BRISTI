import { CollectionModel } from '../models/Collection';
import { BaseRepository } from './base.repository';
import { ICollection } from '../../shared/types';
import { Types } from 'mongoose';

export class CollectionRepository extends BaseRepository<ICollection> {
  constructor() {
    super(CollectionModel);
  }

  async findBySlug(slug: string): Promise<ICollection | null> {
    return this.findOne({ slug });
  }

  async findActive(options: any = {}): Promise<ICollection[]> {
    return this.findMany({ isActive: true }, options);
  }

  async findFeatured(limit: number = 10): Promise<ICollection[]> {
    const now = new Date();
    return this.findMany(
      { 
        featured: true, 
        isActive: true,
        $or: [
          { featuredUntil: { $exists: false } },
          { featuredUntil: { $gt: now } }
        ]
      },
      { sort: { featuredUntil: -1 }, limit }
    );
  }

  async findCurrent(options: any = {}): Promise<ICollection[]> {
    const now = new Date();
    return this.findMany(
      { 
        isActive: true,
        $and: [
          { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }] },
          { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] }
        ]
      },
      options
    );
  }

  async getCollectionWithProducts(collectionId: string): Promise<any> {
    return this.model.aggregate([
      { $match: { _id: new Types.ObjectId(collectionId) } },
      {
        $lookup: {
          from: 'products',
          localField: 'products',
          foreignField: '_id',
          as: 'products'
        }
      },
      { $unwind: { path: '$products', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'productcategories', // Assuming we have a junction table or direct reference
          localField: 'products._id',
          foreignField: 'category',
          as: 'productCategories'
        }
      },
      {
        $group: {
          _id: '$_id',
          name: { $first: '$name' },
          slug: { $first: '$slug' },
          description: { $first: '$description' },
          image: { $first: '$image' },
          bannerImage: { $first: '$bannerImage' },
          video: { $first: '$video' },
          products: { $push: '$products' },
          featured: { $first: '$featured' },
          featuredUntil: { $first: '$featuredUntil' },
          startDate: { $first: '$startDate' },
          endDate: { $first: '$endDate' },
          isActive: { $first: '$isActive' },
          seo: { $first: '$seo' }
        }
      }
    ]).exec();
  }
}
