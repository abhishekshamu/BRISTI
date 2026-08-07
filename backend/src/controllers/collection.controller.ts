import { Request, Response } from 'express';
import { CollectionService } from '../services/collection.service';
import { asyncHandler } from '../middleware/async';

export class CollectionController {
  constructor(private collectionService: CollectionService) {}

  getCollections = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, featured, includeInactive } = req.query;
    
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { createdAt: -1 }
    };
    
    // Public default: active only. The admin CMS passes includeInactive=true
    // so draft/hidden collections remain manageable.
    const filter: any = includeInactive === 'true' ? {} : { isActive: true };
    if (featured !== undefined) {
      filter.featured = featured === 'true';
    }
    
    const result = await this.collectionService.getCollections(filter, options);
    const data = await this.collectionService.attachProductCounts(result.data);
    
    res.status(200).json({
      success: true,
      data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages
      }
    });
  });

  getCollectionById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const collection = await this.collectionService.getCollectionById(id);
    
    res.status(200).json({
      success: true,
      data: collection
    });
  });

  getCollectionBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const collection = await this.collectionService.getCollectionBySlug(slug);

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    res.status(200).json({
      success: true,
      data: collection
    });
  });

  getCollectionProducts = asyncHandler(async (req: Request, res: Response) => {
    const { collectionId } = req.params;
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;
    
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { [sort as string]: order === 'desc' ? -1 : 1 }
    };
    
    // Accepts either a Mongo id or a collection slug; products are matched
    // through the collections array (OR semantics).
    const products = await this.collectionService.getCollectionProducts(collectionId, options);
    
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

  getCollectionProductsBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = req.query;
    
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { [sort as string]: order === 'desc' ? -1 : 1 }
    };
    
    const products = await this.collectionService.getCollectionProducts(slug, options);
    
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

  getFeaturedCollections = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 10 } = req.query;
    const collections = await this.collectionService.getFeaturedCollections(parseInt(limit as string));
    
    res.status(200).json({
      success: true,
      data: collections
    });
  });

  getCurrentCollections = asyncHandler(async (req: Request, res: Response) => {
    const collections = await this.collectionService.getCurrentCollections();
    
    res.status(200).json({
      success: true,
      data: collections
    });
  });

  createCollection = asyncHandler(async (req: Request, res: Response) => {
    const collection = await this.collectionService.createCollection(req.body);
    
    res.status(201).json({
      success: true,
      data: collection
    });
  });

  updateCollection = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const collection = await this.collectionService.updateCollection(id, req.body);
    
    res.status(200).json({
      success: true,
      data: collection
    });
  });

  deleteCollection = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const deleted = await this.collectionService.deleteCollection(id);
    
    res.status(200).json({
      success: true,
      data: deleted
    });
  });
}