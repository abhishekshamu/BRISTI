import { Request, Response } from 'express';
import { BlogService } from '../services/blog.service';
import { asyncHandler } from '../middleware/async';

export class BlogController {
  constructor(private blogService: BlogService) {}

  createBlogPost = asyncHandler(async (req: Request, res: Response) => {
    const post = await this.blogService.createBlogPost(req.body);
    res.status(201).json({
      success: true,
      data: post
    });
  });

  getBlogPosts = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status, featured } = req.query;
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { createdAt: -1 }
    };

    const filter: any = {};
    if (status) filter.status = status;
    if (featured === 'true') filter.featured = true;

    const result = await this.blogService.getAllBlogPosts(filter, options);

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

  getPublishedBlogPosts = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, featured } = req.query;
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      sort: { publishedAt: -1 }
    };

    const filter: any = { status: 'published' };
    if (featured === 'true') filter.featured = true;

    const result = await this.blogService.getPublishedBlogPosts(filter, options);

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

  getBlogPostById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const post = await this.blogService.getBlogPostById(id, req.authType === 'admin');
    res.status(200).json({
      success: true,
      data: post
    });
  });

  getBlogPostBySlug = asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;
    const post = await this.blogService.getBlogPostBySlug(slug, req.authType === 'admin');
    res.status(200).json({
      success: true,
      data: post
    });
  });

  getFeaturedPosts = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 5 } = req.query;
    const posts = await this.blogService.getFeaturedPosts(parseInt(limit as string));
    res.status(200).json({
      success: true,
      data: posts
    });
  });

  getRecentPosts = asyncHandler(async (req: Request, res: Response) => {
    const { limit = 5 } = req.query;
    const posts = await this.blogService.getRecentPosts(parseInt(limit as string));
    res.status(200).json({
      success: true,
      data: posts
    });
  });

  searchPosts = asyncHandler(async (req: Request, res: Response) => {
    const { q: query, page = 1, limit = 10 } = req.query;
    if (!query) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }
    const options: any = {
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    };
    const posts = await this.blogService.searchPosts(query as string, options);
    res.status(200).json({
      success: true,
      data: posts
    });
  });

  getPostsByTag = asyncHandler(async (req: Request, res: Response) => {
    const { tag } = req.params;
    const posts = await this.blogService.getPostsByTag(tag);
    res.status(200).json({
      success: true,
      data: posts
    });
  });

  getRelatedPosts = asyncHandler(async (req: Request, res: Response) => {
    const { postId } = req.params;
    const { limit = 3 } = req.query;
    const posts = await this.blogService.getRelatedPosts(postId, parseInt(limit as string));
    res.status(200).json({
      success: true,
      data: posts
    });
  });

  updateBlogPost = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const post = await this.blogService.updateBlogPost(id, req.body);
    res.status(200).json({
      success: true,
      data: post
    });
  });

  deleteBlogPost = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.blogService.deleteBlogPost(id);
    res.status(200).json({
      success: true,
      message: 'Blog post deleted successfully'
    });
  });

  getBlogStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.blogService.getBlogStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  });
}
