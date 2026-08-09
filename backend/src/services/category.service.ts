import { CategoryRepository } from '../repositories/category.repository';
import { ProductRepository } from '../repositories/product.repository';
import { CouponRepository } from '../repositories/coupon.repository';
import { ICategory } from '../../shared/types';
import { NotFoundError, BadRequestException } from '../utils/exceptions';
import { slugify } from '../../shared/utils';

export class CategoryService {
  constructor(
    private categoryRepo: CategoryRepository,
    private productRepo: ProductRepository,
    private couponRepo: CouponRepository
  ) {}

  async getCategories(filter: any = {}, options: any = {}): Promise<any> {
    return this.categoryRepo.paginate(filter, options);
  }

  private async attachLiveCounts(categories: any[]): Promise<void> {
    if (!categories.length) return;
    const ids = categories.map((category) => category._id);
    const rows = await this.productRepo.aggregate([
      { $match: { category: { $in: ids }, status: 'active' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const countById = new Map<string, number>();
    for (const row of rows) countById.set(String(row._id), row.count ?? 0);
    for (const category of categories) {
      category.productCount = countById.get(String(category._id)) ?? 0;
    }
  }

  async getCategoryById(id: string): Promise<ICategory> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }
    await this.attachLiveCounts([category]);
    return category;
  }

  async getCategoryBySlug(slug: string): Promise<ICategory> {
    const category = await this.categoryRepo.findBySlug(slug);
    if (!category) {
      throw new NotFoundError('Category not found');
    }
    await this.attachLiveCounts([category]);
    return category;
  }

  async getCategoryTree(): Promise<any[]> {
    const categories = await this.categoryRepo.findMany({ isActive: true }, { sort: { sortOrder: 1, name: 1 } });

    const categoryMap = new Map();
    const roots: any[] = [];

    for (const category of categories) {
      categoryMap.set(category._id.toString(), {
        ...category.toObject(),
        children: []
      });
    }

    for (const [_, category] of categoryMap) {
      if (category.parentId) {
        const parent = categoryMap.get(category.parentId);
        if (parent) {
          parent.children.push(category);
        }
      } else {
        roots.push(category);
      }
    }

    await this.attachLiveCounts([...categoryMap.values()]);

    return roots;
  }

  async getCategoryProducts(categoryId: string, options: any = {}): Promise<any> {
    const category = await this.categoryRepo.findById(categoryId);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return this.productRepo.paginate(
      { category: categoryId, status: 'active' },
      options
    );
  }

  async createCategory(data: Partial<ICategory>): Promise<ICategory> {
    if (!data.name) {
      throw new BadRequestException('Category name is required');
    }
    if (data.parentId === '') delete data.parentId;

    if (!data.slug) {
      data.slug = slugify(data.name);
    }

    const existing = await this.categoryRepo.findBySlug(data.slug);
    if (existing) {
      throw new BadRequestException('Category with this slug already exists');
    }
    if (data.parentId) {
      const parent: any = await this.categoryRepo.findById(data.parentId);
      if (!parent) throw new BadRequestException('Parent category not found');
      data.level = Number(parent.level || 0) + 1;
    } else data.level = 0;

    return this.categoryRepo.create(data);
  }

  async updateCategory(id: string, updateData: Partial<ICategory>): Promise<ICategory> {
    if (updateData.parentId === '') delete updateData.parentId;
    if (updateData.name && !updateData.slug) {
      updateData.slug = slugify(updateData.name);
    }
    if (updateData.parentId) {
      if (String(updateData.parentId) === id) throw new BadRequestException('A category cannot be its own parent');
      const descendants = await this.categoryRepo.getDescendants(id);
      if (descendants.includes(String(updateData.parentId))) throw new BadRequestException('Cannot move a category under its descendant');
      const parent: any = await this.categoryRepo.findById(updateData.parentId);
      if (!parent) throw new BadRequestException('Parent category not found');
      updateData.level = Number(parent.level || 0) + 1;
    }

    const updated = await this.categoryRepo.updateById(id, updateData);
    if (!updated) {
      throw new NotFoundError('Category not found');
    }
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const category = await this.categoryRepo.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const activeProductCount = await this.productRepo.count({ category: id, status: 'active' });
    if (activeProductCount > 0) {
      throw new BadRequestException('Cannot delete category with active products');
    }

    // Prevent orphaned child categories: reparent them to the deleted category's parent
    const children = await this.categoryRepo.findMany({ parentId: id }, {});
    if (children.length > 0) {
      await this.categoryRepo.updateMany(
        { parentId: id },
        { $set: { parentId: category.parentId || null, level: category.level } }
      );
    }

    // Pull this category out of any coupon category scopes
    await this.couponRepo.updateMany(
      { categoryIds: id },
      { $pull: { categoryIds: id } }
    );

    return this.categoryRepo.deleteById(id);
  }

  async getCategoryCount(): Promise<number> {
    return this.categoryRepo.count({ isActive: true });
  }

  async getPopularCategories(limit: number = 10): Promise<any[]> {
    return this.categoryRepo.findMany({ isActive: true }, { limit, sort: { sortOrder: 1 } });
  }
}

