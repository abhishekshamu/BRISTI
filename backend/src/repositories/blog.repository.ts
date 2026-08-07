import { BlogPostModel } from '../models/BlogPost';
import { BaseRepository } from './base.repository';
import { IBlogPost } from 'shared/types';

export class BlogRepository extends BaseRepository<IBlogPost> {
  constructor() {
    super(BlogPostModel);
  }

  async findBySlug(slug: string): Promise<IBlogPost | null> {
    return this.findOne({ slug });
  }

  async findPublished(options: any = {}): Promise<IBlogPost[]> {
    const now = new Date();
    return this.findMany(
      { 
        status: 'published',
        publishedAt: { $lte: now }
      },
      options
    );
  }

  async findFeatured(limit: number = 5): Promise<IBlogPost[]> {
    const now = new Date();
    return this.findMany(
      { 
        featured: true,
        status: 'published',
        publishedAt: { $lte: now }
      },
      { sort: { publishedAt: -1 }, limit }
    );
  }

  async findByTag(tag: string, options: any = {}): Promise<IBlogPost[]> {
    return this.findMany(
      { 
        tags: tag,
        status: 'published'
      },
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
    // Use the title/content text index instead of a collection scan regex.
    const escaped = String(query)
      .replace(/"/g, ' ')
      .trim()
      .slice(0, 100);
    if (!escaped) return [];
    return this.findMany(
      {
        $text: { $search: escaped },
        status: 'published'
      },
      { score: { $meta: 'textScore' }, ...options }
    );
  }

  async getRecentPosts(limit: number = 5): Promise<IBlogPost[]> {
    const now = new Date();
    return this.findMany(
      { 
        status: 'published',
        publishedAt: { $lte: now }
      },
      { sort: { publishedAt: -1 }, limit }
    );
  }

  async getRelatedPosts(postId: string, limit: number = 3): Promise<IBlogPost[]> {
    const post = await this.findById(postId);
    if (!post) return [];
    
    const tags = post.tags || [];
    if (tags.length === 0) return [];
    
    return this.findMany(
      {
        _id: { $ne: postId },
        tags: { $in: tags },
        status: 'published'
      },
      { limit }
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
          _id: '$status',
          count: { $sum: 1 },
          totalViews: { $sum: '$views' }
        }
      }
    ]).exec();
  }
}
