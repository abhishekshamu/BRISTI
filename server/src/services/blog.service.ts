import { BlogRepository } from '../repositories/blog.repository';
import { IBlogPost } from 'shared/types';
import { NotFoundError, BadRequestException } from '../utils/exceptions';
import { slugify } from 'shared/utils';

export class BlogService {
  constructor(private blogRepo: BlogRepository) {}

  async createBlogPost(data: Partial<IBlogPost>): Promise<IBlogPost> {
    if (!data.title) {
      throw new BadRequestException('Title is required');
    }

    if (!data.slug) {
      data.slug = slugify(data.title);
    }

    const existing = await this.blogRepo.findBySlug(data.slug);
    if (existing) {
      throw new BadRequestException('Blog post with this slug already exists');
    }

    if (data.status === 'published' && !data.publishedAt) {
      data.publishedAt = new Date();
    }

    return this.blogRepo.create(data);
  }

  async getBlogPostById(id: string): Promise<IBlogPost> {
    const post = await this.blogRepo.findById(id);
    if (!post) {
      throw new NotFoundError('Blog post not found');
    }
    return post;
  }

  async getBlogPostBySlug(slug: string): Promise<IBlogPost> {
    const post = await this.blogRepo.findBySlug(slug);
    if (!post) {
      throw new NotFoundError('Blog post not found');
    }
    await this.blogRepo.incrementViewCount(post._id.toString());
    return post;
  }

  async updateBlogPost(id: string, updateData: Partial<IBlogPost>): Promise<IBlogPost> {
    if (updateData.title && !updateData.slug) {
      updateData.slug = slugify(updateData.title);
    }

    if (updateData.status === 'published' && !updateData.publishedAt) {
      updateData.publishedAt = new Date();
    }

    const updated = await this.blogRepo.updateById(id, updateData);
    if (!updated) {
      throw new NotFoundError('Blog post not found');
    }
    return updated;
  }

  async deleteBlogPost(id: string): Promise<boolean> {
    const post = await this.blogRepo.findById(id);
    if (!post) {
      throw new NotFoundError('Blog post not found');
    }
    return this.blogRepo.deleteById(id);
  }

  async getAllBlogPosts(filter: any = {}, options: any = {}): Promise<any> {
    return this.blogRepo.paginate(filter, options);
  }

  async getPublishedBlogPosts(filter: any = {}, options: any = {}): Promise<any> {
    const now = new Date();
    return this.blogRepo.paginate(
      { status: 'published', publishedAt: { $lte: now }, ...filter },
      options
    );
  }

  async getFeaturedPosts(limit: number = 5): Promise<IBlogPost[]> {
    return this.blogRepo.findFeatured(limit);
  }

  async getRecentPosts(limit: number = 5): Promise<IBlogPost[]> {
    return this.blogRepo.getRecentPosts(limit);
  }

  async searchPosts(query: string, options: any = {}): Promise<IBlogPost[]> {
    return this.blogRepo.search(query, options);
  }

  async getPostsByTag(tag: string, options: any = {}): Promise<IBlogPost[]> {
    return this.blogRepo.findByTag(tag, options);
  }

  async getRelatedPosts(postId: string, limit: number = 3): Promise<IBlogPost[]> {
    return this.blogRepo.getRelatedPosts(postId, limit);
  }

  async getBlogStats(): Promise<any> {
    return this.blogRepo.getBlogStats();
  }
}

