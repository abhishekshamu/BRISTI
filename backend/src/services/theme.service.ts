import { ThemeRepository } from '../repositories/theme.repository';
import { IThemeSettings } from '../../shared/types';
import { mergeThemeWithDefaults, resolvePreset, ThemePresetName } from '../../shared/theme';
import { NotFoundError } from '../utils/exceptions';

export class ThemeService {
  constructor(private themeRepo: ThemeRepository) {}

  private toFullTheme(theme: any): IThemeSettings {
    return mergeThemeWithDefaults(theme?.toObject ? theme.toObject() : theme) as unknown as IThemeSettings;
  }

  async ensureDefaultTheme(): Promise<any> {
    const theme = await this.themeRepo.getActiveTheme();
    if (theme) return theme;

    const anyTheme = await this.themeRepo.findOne({});
    if (anyTheme) {
      if (!anyTheme.isActive) {
        await this.themeRepo.setActiveTheme(anyTheme._id.toString());
        return this.themeRepo.getActiveTheme();
      }
      return anyTheme;
    }

    const preset = resolvePreset('default');
    return this.themeRepo.createTheme({
      name: 'Default',
      description: 'BRISTI default black/white/gold theme',
      isActive: true,
      isDark: false,
      colors: preset.colors,
      typography: preset.typography,
      buttons: preset.buttons,
      header: preset.header,
      footer: preset.footer,
      effects: preset.effects,
    });
  }

  async getActiveTheme(): Promise<IThemeSettings> {
    const theme = await this.ensureDefaultTheme();
    return this.toFullTheme(theme);
  }

  async getAllThemes(options: any = {}): Promise<IThemeSettings[]> {
    const themes = await this.themeRepo.getAllThemes(options);
    return themes.map((t) => this.toFullTheme(t));
  }

  async getThemeById(id: string): Promise<IThemeSettings> {
    const theme = await this.themeRepo.getThemeById(id);
    if (!theme) {
      throw new NotFoundError('Theme not found');
    }
    return this.toFullTheme(theme);
  }

  async createTheme(data: Partial<IThemeSettings>): Promise<IThemeSettings> {
    const merged = mergeThemeWithDefaults(data) as IThemeSettings;
    const created = await this.themeRepo.createTheme({
      name: merged.name,
      description: (merged as any).description,
      isActive: merged.isActive,
      isDark: merged.isDark,
      colors: merged.colors,
      typography: merged.typography,
      buttons: merged.buttons,
      header: merged.header,
      footer: merged.footer,
      effects: merged.effects,
    });
    return this.toFullTheme(created);
  }

  async updateTheme(id: string, data: Partial<IThemeSettings>): Promise<IThemeSettings> {
    const existing = await this.themeRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('Theme not found');
    }
    const plain = (existing as any).toObject ? (existing as any).toObject() : existing;
    const merged = mergeThemeWithDefaults({ ...plain, ...data }) as IThemeSettings;
    const updated = await this.themeRepo.updateTheme(id, {
      name: merged.name,
      description: (merged as any).description,
      isActive: merged.isActive,
      isDark: merged.isDark,
      colors: merged.colors,
      typography: merged.typography,
      buttons: merged.buttons,
      header: merged.header,
      footer: merged.footer,
      effects: merged.effects,
    });
    return this.toFullTheme(updated);
  }

  async updateActiveTheme(data: Partial<IThemeSettings>): Promise<IThemeSettings> {
    const theme = await this.ensureDefaultTheme();
    const plain = theme.toObject ? theme.toObject() : theme;
    const merged = mergeThemeWithDefaults({ ...plain, ...data }) as IThemeSettings;
    const updated = await this.themeRepo.updateTheme(theme._id.toString(), {
      name: merged.name,
      description: (merged as any).description,
      isActive: true,
      isDark: merged.isDark,
      colors: merged.colors,
      typography: merged.typography,
      buttons: merged.buttons,
      header: merged.header,
      footer: merged.footer,
      effects: merged.effects,
    });
    return this.toFullTheme(updated);
  }

  async resetActiveTheme(): Promise<IThemeSettings> {
    const theme = await this.ensureDefaultTheme();
    const preset = resolvePreset('default');
    const updated = await this.themeRepo.updateTheme(theme._id.toString(), {
      name: 'Default',
      description: 'BRISTI default black/white/gold theme',
      isActive: true,
      isDark: false,
      colors: preset.colors,
      typography: preset.typography,
      buttons: preset.buttons,
      header: preset.header,
      footer: preset.footer,
      effects: preset.effects,
    });
    return this.toFullTheme(updated);
  }

  async applyPreset(name: ThemePresetName): Promise<IThemeSettings> {
    const theme = await this.ensureDefaultTheme();
    const preset = resolvePreset(name);
    const current = theme.toObject ? theme.toObject() : theme;
    const merged = mergeThemeWithDefaults({
      ...current,
      isDark: preset.isDark ?? current.isDark,
      colors: preset.colors || current.colors,
      typography: preset.typography || current.typography,
      buttons: preset.buttons || current.buttons,
      header: preset.header || current.header,
      footer: preset.footer || current.footer,
      effects: preset.effects || current.effects,
    });
    const updated = await this.themeRepo.updateTheme(theme._id.toString(), {
      isDark: merged.isDark,
      colors: merged.colors,
      typography: merged.typography,
      buttons: merged.buttons,
      header: merged.header,
      footer: merged.footer,
      effects: merged.effects,
    });
    return this.toFullTheme(updated);
  }

  async duplicateTheme(): Promise<IThemeSettings> {
    const theme = await this.ensureDefaultTheme();
    const full = this.toFullTheme(theme);
    const created = await this.themeRepo.createTheme({
      name: `${full.name} (Copy)`,
      description: (full as any).description,
      isActive: false,
      isDark: full.isDark,
      colors: full.colors,
      typography: full.typography,
      buttons: full.buttons,
      header: full.header,
      footer: full.footer,
      effects: full.effects,
    });
    return this.toFullTheme(created);
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
    return this.toFullTheme(theme);
  }
}
