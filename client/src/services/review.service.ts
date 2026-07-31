import { api } from '@/lib/api';
import type { Review } from '@shared/types';

export const reviewService = {
  async featured(limit = 6): Promise<Review[]> {
    const response = await api.get('/reviews/featured', { params: { limit } });
    return response.data.data as Review[];
  },

  async getByProduct(productId: string, limit = 10): Promise<Review[]> {
    const response = await api.get(`/reviews/product/${productId}`, { params: { limit } });
    return response.data.data as Review[];
  },

  async create(data: { productId: string; rating: number; title?: string; comment: string; images?: string[] }): Promise<Review> {
    const response = await api.post('/reviews', data);
    return response.data.data as Review;
  },

  async update(reviewId: string, data: Partial<Pick<Review, 'rating' | 'title' | 'comment' | 'images'>>): Promise<Review> {
    const response = await api.put(`/reviews/${reviewId}`, data);
    return response.data.data as Review;
  },
};
