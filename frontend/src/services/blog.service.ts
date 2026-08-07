import { api } from '@/lib/api';
import type { BlogPost, PaginatedResponse } from '@shared/types';

export const blogService = {
  async list(params: { page?: number; limit?: number; featured?: boolean } = {}): Promise<PaginatedResponse<BlogPost>> {
    const response = await api.get('/blogs', { params });
    return response.data as PaginatedResponse<BlogPost>;
  },

  async featured(limit = 3): Promise<BlogPost[]> {
    const response = await api.get('/blogs/featured', { params: { limit } });
    return response.data.data as BlogPost[];
  },

  async recent(limit = 3): Promise<BlogPost[]> {
    const response = await api.get('/blogs/recent', { params: { limit } });
    return response.data.data as BlogPost[];
  },

  async search(q: string): Promise<BlogPost[]> {
    const response = await api.get('/blogs/search', { params: { q } });
    return response.data.data as BlogPost[];
  },

  async byTag(tag: string): Promise<BlogPost[]> {
    const response = await api.get(`/blogs/tag/${tag}`);
    return response.data.data as BlogPost[];
  },

  async related(postId: string, limit = 3): Promise<BlogPost[]> {
    const response = await api.get(`/blogs/related/${postId}`, { params: { limit } });
    return response.data.data as BlogPost[];
  },

  async getBySlug(slug: string): Promise<BlogPost> {
    const response = await api.get(`/blogs/slug/${slug}`);
    return response.data.data as BlogPost;
  },
};
