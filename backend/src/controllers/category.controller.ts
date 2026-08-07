import { Request, Response } from 'express';
import { CategoryService } from '../services/category.service';
import { asyncHandler } from '../middleware/async';

export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  getCategories = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, parentId, includeInactive } = req.query;

    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { sortOrder: 1, name: 1 }
    };

    // Public default: active only. The admin CMS passes includeInactive=true
    // so draft/hidden categories remain manageable.
    const filter: any = includeInactive === 'true' ? {} : { isActive: true };
    if (parentId !== undefined) {
      if (parentId === 'null') {
        filter.parentId = null;
      } else {
        filter.parentId = parentId;
      }
    }

    const result = await this.categoryService.getCategories(filter, options);

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages
      }
    });
  });

  getCategoryById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const category = await this.categoryService.getCategoryById(id);

    res.status(200).json({
      success: true,
      data: category
    });
  });

  getCategoryBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const category = await this.categoryService.getCategoryBySlug(slug);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  });

  getCategoryTree = asyncHandler(async (req: Request, res: Response) => {
    const tree = await this.categoryService.getCategoryTree();

    res.status(200).json({
      success: true,
      data: tree
    });
  });

  getCategoryProducts = asyncHandler(async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;

    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { [sort as string]: order === 'desc' ? -1 : 1 }
    };

    const products = await this.categoryService.getCategoryProducts(categoryId, options);

    res.status(200).json({
      success: true,
      data: products.data,
      pagination: {
        page: products.page,
        limit: products.limit,
        total: products.total,
        pages: products.pages
      }
    });
  });

  createCategory = asyncHandler(async (req: Request, res: Response) => {
    const category = await this.categoryService.createCategory(req.body);
    res.status(201).json({
      success: true,
      data: category
    });
  });

  updateCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const category = await this.categoryService.updateCategory(id, req.body);
    res.status(200).json({
      success: true,
      data: category
    });
  });

  deleteCategory = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.categoryService.deleteCategory(id);
    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  });
}

