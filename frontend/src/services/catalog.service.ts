import { api } from '@/lib/api';
import type { Category, Collection, PaginatedResponse, Product } from '@shared/types';

export interface CategoryNode extends Category {
  children?: CategoryNode[];
}

export const catalogService = {
  async listCategories(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<Category>> {
    const response = await api.get('/categories', { params });
    return response.data as PaginatedResponse<Category>;
  },

  async categoryTree(): Promise<CategoryNode[]> {
    const response = await api.get('/categories/tree');
    return response.data.data as CategoryNode[];
  },

  async getCategoryBySlug(slug: string): Promise<Category> {
    const response = await api.get(`/categories/slug/${slug}`);
    return response.data.data as Category;
  },

  async categoryProducts(categoryId: string, params: { page?: number; limit?: number; sort?: string; order?: string } = {}): Promise<PaginatedResponse<Product>> {
    const response = await api.get(`/categories/${categoryId}/products`, { params });
    return response.data as PaginatedResponse<Product>;
  },

  async listCollections(params: { page?: number; limit?: number; featured?: boolean } = {}): Promise<PaginatedResponse<Collection>> {
    const response = await api.get('/collections', { params });
    return response.data as PaginatedResponse<Collection>;
  },

  async featuredCollections(limit = 4): Promise<Collection[]> {
    const response = await api.get('/collections/featured', { params: { limit } });
    return response.data.data as Collection[];
  },

  async currentCollections(): Promise<Collection[]> {
    const response = await api.get('/collections/current');
    return response.data.data as Collection[];
  },

  async getCollectionBySlug(slug: string): Promise<Collection> {
    const response = await api.get(`/collections/slug/${slug}`);
    return response.data.data as Collection;
  },
};
