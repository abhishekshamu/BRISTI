import { api } from '@/lib/api';
import type { HeroBlock } from '@shared/types';

export const heroService = {
  async getActive(): Promise<HeroBlock[]> {
    const response = await api.get('/hero');
    return response.data.data as HeroBlock[];
  },
};
