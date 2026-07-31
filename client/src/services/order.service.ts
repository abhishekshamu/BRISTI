import { api } from '@/lib/api';
import type { Order, PaginatedResponse } from '@shared/types';

export interface OrderItemPayload {
  productId: string;
  variantId?: string;
  quantity: number;
  selectedOptions?: Record<string, string>;
}

export interface CreateOrderPayload {
  userId: string;
  items: OrderItemPayload[];
  shippingAddress: Record<string, string>;
  billingAddress?: Record<string, string>;
  paymentMethod: string;
  couponCode?: string;
  notes?: string;
}

export const orderService = {
  async create(payload: CreateOrderPayload): Promise<Order> {
    const response = await api.post('/orders', payload);
    return response.data.data as Order;
  },

  async myOrders(userId: string, params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<Order>> {
    const response = await api.get(`/orders/user/${userId}`, { params });
    return response.data as PaginatedResponse<Order>;
  },

  async getById(id: string): Promise<Order> {
    const response = await api.get(`/orders/${id}`);
    return response.data.data as Order;
  },

  async cancel(id: string): Promise<Order> {
    const response = await api.put(`/orders/${id}/cancel`);
    return response.data.data as Order;
  },
};
