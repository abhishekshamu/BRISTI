import { api } from '@/lib/api';
import type { PaginatedResponse, Product, Review } from '@shared/types';

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  category?: string;
  collection?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
}

export interface SearchQueryParams {
  q: string;
  page?: number;
  limit?: number;
}

export const productService = {
  async list(params: ProductQueryParams = {}): Promise<PaginatedResponse<Product>> {
    const response = await api.get('/products', { params });
    return response.data as PaginatedResponse<Product>;
  },

  async featured(limit = 8): Promise<Product[]> {
    const response = await api.get('/products/featured', { params: { limit } });
    return response.data.data as Product[];
  },

  async newArrivals(limit = 8): Promise<Product[]> {
    const response = await api.get('/products/new-arrivals', { params: { limit } });
    return response.data.data as Product[];
  },

  async onSale(limit = 8): Promise<Product[]> {
    const response = await api.get('/products/on-sale', { params: { limit } });
    return response.data.data as Product[];
  },

  async bestSellers(limit = 4): Promise<Product[]> {
    const response = await api.get('/products/best-sellers', { params: { limit } });
    return response.data.data as Product[];
  },

  async trending(limit = 4): Promise<Product[]> {
    const response = await api.get('/products/trending', { params: { limit } });
    return response.data.data as Product[];
  },

  async search(params: SearchQueryParams): Promise<Product[]> {
    const response = await api.get('/products/search', { params });
    return response.data.data as Product[];
  },

  async byCategory(categoryId: string, params: { page?: number; limit?: number; sort?: string; order?: string } = {}): Promise<Product[]> {
    const response = await api.get(`/products/category/${categoryId}`, { params });
    const payload = response.data.data as { data?: Product[] };
    return payload.data ?? [];
  },

  async byCollection(collectionId: string, params: { page?: number; limit?: number; sort?: string; order?: string } = {}): Promise<Product[]> {
    const response = await api.get(`/products/collection/${collectionId}`, { params });
    const payload = response.data.data as { data?: Product[] };
    return payload.data ?? [];
  },

  async getById(id: string): Promise<Product> {
    const response = await api.get(`/products/${id}`);
    return response.data.data as Product;
  },

  async getBySlug(slug: string): Promise<Product> {
    const response = await api.get(`/products/slug/${slug}`);
    return response.data.data as Product;
  },

  async getReviews(productId: string, limit = 10): Promise<Review[]> {
    const response = await api.get(`/products/${productId}/reviews`, { params: { limit } });
    return response.data.data as Review[];
  },

  async related(product: Product): Promise<Product[]> {
    if (!product.category) return [];
    try {
      const params: ProductQueryParams = { category: String(product.category), limit: 4, sort: 'rating.average', order: 'desc' };
      const response = await api.get('/products', { params });
      const items = (response.data as PaginatedResponse<Product>).data ?? [];
      return items.filter((item) => String(item._id) !== String(product._id)).slice(0, 4);
    } catch {
      return [];
    }
  },

  async getByIds(ids: string[]): Promise<Product[]> {
    if (!ids.length) return [];
    const response = await api.get('/products/by-ids', { params: { ids: ids.join(',') } });
    return response.data.data as Product[];
  },
};
