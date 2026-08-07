import { Request, Response } from 'express';
import { ProductService } from '../services/product.service';
import { asyncHandler } from '../middleware/async';
import { ValidationError } from '../utils/exceptions';

export class ProductController {
  constructor(private productService: ProductService) {}

  createProduct = asyncHandler(async (req: Request, res: Response) => {
    const product = await this.productService.createProduct(req.body);
    res.status(201).json({
      success: true,
      data: product
    });
  });

  getProductById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const product = await this.productService.getProductById(id);
    // Non-active products (draft/archived) are only visible to admins.
    if (product.status !== 'active' && req.authType !== 'admin') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({
      success: true,
      data: product
    });
  });

  getProductBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const product = await this.productService.getProductBySlug(slug);
    if (product.status !== 'active' && req.authType !== 'admin') {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({
      success: true,
      data: product
    });
  });

  updateProduct = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const product = await this.productService.updateProduct(id, req.body);
    res.status(200).json({
      success: true,
      data: product
    });
  });

  deleteProduct = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.productService.deleteProduct(id);
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  });

  getProducts = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc', ...filters } = req.query;
    
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { [sort as string]: order === 'desc' ? -1 : 1 }
    };
    
    const result = await this.productService.getProducts({
      ...filters,
      ...options
    });
    
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

  getFeaturedProducts = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;
    const products = await this.productService.getFeaturedProducts(parseInt(limit as string));
    res.status(200).json({
      success: true,
      data: products
    });
  });

  getNewArrivals = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;
    const products = await this.productService.getNewArrivals(parseInt(limit as string));
    res.status(200).json({
      success: true,
      data: products
    });
  });

  getOnSaleProducts = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;
    const products = await this.productService.getOnSaleProducts(parseInt(limit as string));
    res.status(200).json({
      success: true,
      data: products
    });
  });

  getBestSellers = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;
    const products = await this.productService.getBestSellers(parseInt(limit as string));
    res.status(200).json({
      success: true,
      data: products
    });
  });

  getTrendingProducts = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;
    const products = await this.productService.getTrendingProducts(parseInt(limit as string));
    res.status(200).json({
      success: true,
      data: products
    });
  });

  searchProducts = asyncHandler(async (req: Request, res: Response) => {
    const { q } = req.query;
    if (!q) {
      throw new ValidationError('Please provide search query');
    }
    
    const { page = 1, limit = 20 } = req.query;
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };
    
    const products = await this.productService.searchProducts(q as string, options);
    res.status(200).json({
      success: true,
      data: products
    });
  });

  getProductsByCategory = asyncHandler(async (req: Request, res: Response) => {
    const { categoryId } = req.params;
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;
    
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { [sort as string]: order === 'desc' ? -1 : 1 }
    };
    
    const products = await this.productService.getProductsByCategory(categoryId, options);
    
    res.status(200).json({
      success: true,
      data: products
    });
  });

  getProductsByCollection = asyncHandler(async (req: Request, res: Response) => {
    const { collectionId } = req.params;
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;
    
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { [sort as string]: order === 'desc' ? -1 : 1 }
    };
    
    const products = await this.productService.getProductsByCollection(collectionId, options);
    
    res.status(200).json({
      success: true,
      data: products
    });
  });

  getProductReviews = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const reviews = await this.productService.getProductReviews(productId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });
    
    res.status(200).json({
      success: true,
      data: reviews
    });
  });

  getRelatedProducts = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { limit = 4 } = req.query;
    const products = await this.productService.getRelatedProducts(productId, parseInt(limit as string));
    res.status(200).json({
      success: true,
      data: products
    });
  });

  getByIds = asyncHandler(async (req: Request, res: Response) => {
    const { ids } = req.query;
    const idList = typeof ids === 'string'
      ? ids.split(',').map((id) => id.trim()).filter(Boolean)
      : [];
    const products = await this.productService.getByIds(idList);
    res.status(200).json({
      success: true,
      data: products
    });
  });

  addProductReview = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    
    const review = await this.productService.addProductReview(
      productId, 
      req.user?.id as string, 
      req.body
    );
    
    res.status(201).json({
      success: true,
      data: review
    });
  });

  updateProductStock = asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (quantity === undefined) {
      throw new ValidationError('Please provide quantity');
    }
    
    const product = await this.productService.updateProductStock(
      productId, 
      parseInt(quantity as string)
    );
    
    res.status(200).json({
      success: true,
      data: product
    });
  });
}