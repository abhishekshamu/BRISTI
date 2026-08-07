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

  async myOrders(_userId: string, params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<Order>> {
    // Customer order history comes from the authenticated `/orders` endpoint;
    // `/orders/user/:userId` is admin-only.
    const response = await api.get('/orders', { params });
    return response.data as PaginatedResponse<Order>;
  },

  async getById(id: string): Promise<Order> {
    const response = await api.get(`/orders/${id}`);
    return response.data.data as Order;
  },

  async getByOrderNumber(orderNumber: string): Promise<Order> {
    const response = await api.get(`/orders/by-order-number/${encodeURIComponent(orderNumber)}`);
    return response.data.data as Order;
  },

  async cancel(id: string): Promise<Order> {
    const response = await api.put(`/orders/${id}/cancel`);
    return response.data.data as Order;
  },

  async track(orderNumber: string): Promise<Order> {
    const response = await api.get(`/orders/track/${encodeURIComponent(orderNumber)}`);
    return response.data.data as Order;
  },
};
