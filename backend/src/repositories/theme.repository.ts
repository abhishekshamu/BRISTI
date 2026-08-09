import { ThemeModel } from '../models/Theme';
import { BaseRepository } from './base.repository';
import { IThemeSettings } from '../../shared/types';

export class ThemeRepository extends BaseRepository<IThemeSettings> {
  constructor() {
    super(ThemeModel);
  }

  async getActiveTheme(): Promise<IThemeSettings | null> {
    return this.findOne({ isActive: true });
  }

  async getThemeById(id: string): Promise<IThemeSettings | null> {
    return this.findById(id);
  }

  async getAllThemes(options: any = {}): Promise<IThemeSettings[]> {
    return this.findMany({}, options);
  }

  async setActiveTheme(id: string): Promise<IThemeSettings | null> {
    // First, deactivate all themes
    await this.updateMany({ isActive: true }, { $set: { isActive: false } });
    
    // Then activate the selected theme
    return this.updateById(id, { isActive: true });
  }

  async createTheme(data: Partial<IThemeSettings>): Promise<IThemeSettings> {
    // If this is being set as active, deactivate all others first
    if (data.isActive) {
      await this.updateMany({ isActive: true }, { $set: { isActive: false } });
    }
    
    return this.create(data);
  }

  async updateTheme(id: string, data: Partial<IThemeSettings>): Promise<IThemeSettings | null> {
    // If setting to active, deactivate others first
    if (data.isActive) {
      await this.updateMany({ _id: { $ne: id }, isActive: true }, { $set: { isActive: false } });
    }
    
    return this.updateById(id, data);
  }

  async deleteTheme(id: string): Promise<boolean> {
    const theme = await this.findById(id);
    
    // If trying to delete the active theme, prevent it unless there are others
    if (theme && theme.isActive) {
      const count = await this.count({});
      if (count <= 1) {
        throw new Error('Cannot delete the last remaining theme');
      }
      
      // Activate another theme before deleting
      const anotherTheme = await this.findOne({ _id: { $ne: id } });
      if (anotherTheme) {
        await this.setActiveTheme(anotherTheme._id.toString());
      }
    }
    
    return this.deleteById(id);
  }

  async getThemeCount(): Promise<number> {
    return this.count({});
  }
}
