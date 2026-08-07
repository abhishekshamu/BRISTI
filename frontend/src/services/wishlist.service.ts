import { api } from '@/lib/api';
import type { Wishlist } from '@shared/types';

export const wishlistService = {
  async getWishlist(): Promise<Wishlist> {
    const response = await api.get('/wishlist');
    return response.data.data as Wishlist;
  },

  async add(productId: string): Promise<Wishlist> {
    const response = await api.post('/wishlist', { productId });
    return response.data.data as Wishlist;
  },

  async remove(productId: string): Promise<Wishlist> {
    const response = await api.delete(`/wishlist/${productId}`);
    return response.data.data as Wishlist;
  },

  async check(productId: string): Promise<{ inWishlist: boolean }> {
    const response = await api.get(`/wishlist/check/${productId}`);
    return response.data.data as { inWishlist: boolean };
  },
};
