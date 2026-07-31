import { api } from '@/lib/api';
import type { Cart } from '@shared/types';

export interface AddToCartPayload {
  productId: string;
  variantId?: string;
  quantity: number;
  selectedOptions?: Record<string, string>;
}

export const cartService = {
  async getCart(): Promise<Cart> {
    const response = await api.get('/cart');
    return response.data.data as Cart;
  },

  async addItem(payload: AddToCartPayload): Promise<Cart> {
    const response = await api.post('/cart/add', payload);
    return response.data.data as Cart;
  },

  async updateItemQuantity(itemId: string, quantity: number): Promise<Cart> {
    const response = await api.put(`/cart/items/${itemId}`, { quantity });
    return response.data.data as Cart;
  },

  async removeItem(itemId: string): Promise<void> {
    await api.delete(`/cart/items/${itemId}`);
  },

  async clearCart(): Promise<void> {
    await api.delete('/cart/clear');
  },

  async applyCoupon(couponCode: string): Promise<Cart> {
    const response = await api.post('/cart/apply-coupon', { couponCode });
    return response.data.data as Cart;
  },
};

export function cartItemKey(item: { productId: string; variantId?: string; selectedOptions?: Record<string, string> }): string {
  const variant = item.variantId ?? '';
  const options = item.selectedOptions ? JSON.stringify(item.selectedOptions) : '';
  return `${String(item.productId)}::${variant}::${options}`;
}
