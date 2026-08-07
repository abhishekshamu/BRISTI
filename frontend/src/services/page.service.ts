import { api } from '@/lib/api';
import type { Page } from '@shared/types';

export const pageService = {
  async menu(): Promise<Page[]> {
    const response = await api.get('/pages/menu');
    return response.data.data as Page[];
  },

  async getBySlug(slug: string): Promise<Page> {
    const response = await api.get(`/pages/slug/${slug}`);
    return response.data.data as Page;
  },
};
