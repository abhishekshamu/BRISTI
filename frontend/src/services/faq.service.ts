import { api } from '@/lib/api';
import type { FAQ } from '@shared/types';

export const faqService = {
  async list(): Promise<FAQ[]> {
    const response = await api.get('/faqs', { params: { limit: 100 } });
    return response.data.data as FAQ[];
  },
};
