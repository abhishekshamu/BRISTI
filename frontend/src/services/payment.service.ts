import { api } from '@/lib/api';
import type { Payment } from '@shared/types';

export const paymentService = {
  async createStripeIntent(data: { amount: number; currency?: string; orderId: string }): Promise<{ clientSecret: string }> {
    const response = await api.post('/payment/intent', data);
    return response.data.data as { clientSecret: string };
  },

  async createRazorpayOrder(data: { amount: number; currency?: string; orderId: string }): Promise<Record<string, unknown>> {
    const response = await api.post('/payment/razorpay/order', data);
    return response.data.data as Record<string, unknown>;
  },

  async createPayment(data: { orderId: string; userId: string; amount: number; method: string; transactionId?: string }): Promise<Payment> {
    const response = await api.post('/payment', data);
    return response.data.data as Payment;
  },

  async getByOrder(orderId: string): Promise<Payment> {
    const response = await api.get(`/payment/order/${orderId}`);
    return response.data.data as Payment;
  },
};
