import { ThemeRepository } from '../repositories/theme.repository';
import { IThemeSettings } from 'shared/types';
import { NotFoundError, BadRequestException } from '../utils/exceptions';

export class ThemeService {
  constructor(private themeRepo: ThemeRepository) {}

  async getActiveTheme(): Promise<IThemeSettings> {
    const theme = await this.themeRepo.getActiveTheme();
    if (!theme) {
      throw new NotFoundError('No active theme found');
    }
    return theme;
  }

  async getAllThemes(options: any = {}): Promise<IThemeSettings[]> {
    return this.themeRepo.getAllThemes(options);
  }

  async getThemeById(id: string): Promise<IThemeSettings> {
    const theme = await this.themeRepo.getThemeById(id);
    if (!theme) {
      throw new NotFoundError('Theme not found');
    }
    return theme;
  }

  async createTheme(data: Partial<IThemeSettings>): Promise<IThemeSettings> {
    return this.themeRepo.createTheme(data);
  }

  async updateTheme(id: string, data: Partial<IThemeSettings>): Promise<IThemeSettings> {
    const updated = await this.themeRepo.updateTheme(id, data);
    if (!updated) {
      throw new NotFoundError('Theme not found');
    }
    return updated;
  }

  async deleteTheme(id: string): Promise<boolean> {
    const theme = await this.themeRepo.findById(id);
    if (!theme) {
      throw new NotFoundError('Theme not found');
    }
    return this.themeRepo.deleteTheme(id);
  }

  async setActiveTheme(id: string): Promise<IThemeSettings> {
    const theme = await this.themeRepo.setActiveTheme(id);
    if (!theme) {
      throw new NotFoundError('Theme not found');
    }
    return theme;
  }
}

