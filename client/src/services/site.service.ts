import { api } from '@/lib/api';
import type { SiteSettings, ThemeSettings } from '@shared/types';

export const siteService = {
  async getSettings(): Promise<SiteSettings> {
    const response = await api.get('/settings');
    return response.data.data as SiteSettings;
  },

  async getActiveTheme(): Promise<ThemeSettings> {
    const response = await api.get('/theme');
    return response.data.data as ThemeSettings;
  },
};
