import { api } from '@/lib/api';
import type { Notification, NewsletterSubscriber, PaginatedResponse } from '@shared/types';

export const newsletterService = {
  async subscribe(data: { email: string; firstName?: string; lastName?: string; source?: string }): Promise<NewsletterSubscriber> {
    const response = await api.post('/newsletter/subscribe', data);
    return response.data.data as NewsletterSubscriber;
  },

  async unsubscribe(email: string): Promise<NewsletterSubscriber> {
    const response = await api.post('/newsletter/unsubscribe', { email });
    return response.data.data as NewsletterSubscriber;
  },
};

export const analyticsService = {
  async track(data: { eventName: string; properties?: Record<string, unknown>; url?: string }): Promise<void> {
    try {
      await api.post('/analytics/track', data);
    } catch {
      // Analytics must never break the user experience
    }
  },
};

export const notificationService = {
  async list(params: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<Notification>> {
    const response = await api.get('/notifications', { params });
    return response.data as PaginatedResponse<Notification>;
  },

  async unread(): Promise<Notification[]> {
    const response = await api.get('/notifications/unread');
    return response.data.data as Notification[];
  },

  async count(): Promise<number> {
    const response = await api.get('/notifications/count');
    return response.data.data as number;
  },

  async markRead(id: string): Promise<Notification> {
    const response = await api.put(`/notifications/read/${id}`);
    return response.data.data as Notification;
  },

  async markAllRead(): Promise<void> {
    await api.put('/notifications/read-all');
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },
};
