import { CategoryModel } from '../models/Category';
import { BaseRepository } from './base.repository';
import { ICategory } from '../../shared/types';

export class CategoryRepository extends BaseRepository<ICategory> {
  constructor() {
    super(CategoryModel);
  }

  async findBySlug(slug: string): Promise<ICategory | null> {
    return this.findOne({ slug });
  }

  async findActive(options: any = {}): Promise<ICategory[]> {
    return this.findMany({ isActive: true }, options);
  }

  async findByParent(parentId: string | null, options: any = {}): Promise<ICategory[]> {
    const filter: any = { isActive: true };
    if (parentId === null) {
      filter.parentId = null;
    } else {
      filter.parentId = parentId;
    }
    return this.findMany(filter, options);
  }

  async getCategoryTree(): Promise<any[]> {
    // This would typically be done with an aggregation pipeline
    // For simplicity, we'll return flat list and let the client build the tree
    return this.findMany({ isActive: true }, { sort: { sortOrder: 1, name: 1 } });
  }

  async getDescendants(categoryId: string): Promise<string[]> {
    // Find all descendant category IDs
    const descendants: string[] = [];
    
    const findChildren = async (parentId: string) => {
      const children = await this.findMany({ parentId }, {});
      for (const child of children) {
        descendants.push(child._id.toString());
        await findChildren(child._id.toString());
      }
    };
    
    await findChildren(categoryId);
    return descendants;
  }

  async incrementProductCount(categoryId: string): Promise<ICategory | null> {
    // In a real implementation, this would be handled by transactions or triggers
    // For now, we'll just return the category as-is
    return this.findById(categoryId);
  }
}
