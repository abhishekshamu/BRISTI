import { BlogPostModel } from '../models/BlogPost';
import { BaseRepository } from './base.repository';
import { IBlogPost } from 'shared/types';

export class BlogPostRepository extends BaseRepository<IBlogPost> {
  constructor() {
    super(BlogPostModel);
  }

  async findBySlug(slug: string): Promise<IBlogPost | null> {
    return this.findOne({ slug });
  }

  async findPublished(options: any = {}): Promise<IBlogPost[]> {
    return this.findMany({ status: 'published' }, options);
  }

  async findFeatured(limit: number = 5): Promise<IBlogPost[]> {
    return this.findMany(
      { featured: true, status: 'published' },
      { sort: { publishedAt: -1 }, limit }
    );
  }

  async findRecent(limit: number = 10): Promise<IBlogPost[]> {
    return this.findMany(
      { status: 'published' },
      { sort: { publishedAt: -1 }, limit }
    );
  }

  async findByTag(tag: string, options: any = {}): Promise<IBlogPost[]> {
    return this.findMany(
      { tags: tag, status: 'published' },
      options
    );
  }

  async findByCategory(category: string, options: any = {}): Promise<IBlogPost[]> {
    return this.findMany(
      { category, status: 'published' },
      options
    );
  }

  async search(query: string, options: any = {}): Promise<IBlogPost[]> {
    const searchRegex = new RegExp(query, 'i');
    return this.findMany(
      {
        $or: [
          { title: { $regex: searchRegex } },
          { content: { $regex: searchRegex } },
          { excerpt: { $regex: searchRegex } }
        ],
        status: 'published'
      },
      options
    );
  }

  async incrementViewCount(postId: string): Promise<IBlogPost | null> {
    return this.updateById(postId, { 
      $inc: { views: 1 } 
    });
  }

  async getBlogStats(): Promise<any> {
    return this.model.aggregate([
      {
        $match: { status: 'published' }
      },
      {
        $group: {
          _id: null,
          totalPosts: { $sum: 1 },
          totalViews: { $sum: '$views' },
          avgViews: { $avg: '$views' }
        }
      }
    ]).exec();
  }

  getPostsByTag(tag: string, options: any = {}): Promise<IBlogPost[]> {
    return this.findMany(
      { tags: tag, status: 'published' },
      options
    );
  }

  getPostsByCategory(category: string, options: any = {}): Promise<IBlogPost[]> {
    return this.findMany(
      { category, status: 'published' },
      options
    );
  }

  getRecentPosts(limit: number = 10): Promise<IBlogPost[]> {
    return this.findMany(
      { status: 'published' },
      { sort: { publishedAt: -1 }, limit }
    );
  }

  getFeaturedPosts(limit: number = 5): Promise<IBlogPost[]> {
    return this.findMany(
      { featured: true, status: 'published' },
      { sort: { publishedAt: -1 }, limit }
    );
  }

  getRelatedPosts(postId: string, limit: number = 3): Promise<IBlogPost[]> {
    // This is a simplified version - in reality, you'd want to use tags or categories
    return this.findMany(
      { _id: { $ne: postId }, status: 'published' },
      { sort: { publishedAt: -1 }, limit }
    );
  }
}
