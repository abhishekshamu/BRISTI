import { SettingsModel } from '../models/Settings';
import { BaseRepository } from './base.repository';
import { ISiteSettings } from '../../shared/types';

export class SettingsRepository extends BaseRepository<ISiteSettings> {
  constructor() {
    super(SettingsModel);
  }

  async getSettings(): Promise<ISiteSettings> {
    // Since we ensure only one settings document exists, we can just find one
    let settings = await this.findOne({});
    
    // If no settings exist, create default ones
    if (!settings) {
      settings = await this.create({});
    }
    
    return settings;
  }

  async updateSettings(data: Partial<ISiteSettings>): Promise<ISiteSettings | null> {
    const settings = await this.getSettings();
    
    if (!settings) {
      // Create if doesn't exist
      return this.create(data as ISiteSettings);
    }
    
    return this.updateById(settings._id.toString(), data);
  }

  async updateBranding(branding: {
    brandName?: string;
    logo?: string;
    favicon?: string;
    slogan?: string;
  }): Promise<ISiteSettings | null> {
    return this.updateSettings(branding);
  }

  async updateColors(colors: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
    accent?: string;
  }): Promise<ISiteSettings | null> {
    return this.updateSettings({ colors: { ...(await this.getSettings()).colors, ...colors } });
  }

  async updateTypography(typography: {
    headingFont?: string;
    bodyFont?: string;
    baseSize?: string;
  }): Promise<ISiteSettings | null> {
    const settings = await this.getSettings();
    return this.updateSettings({ 
      typography: { ...settings.typography, ...typography } 
    });
  }

  async updateLayout(layout: {
    headerStyle?: string;
    footerStyle?: string;
  }): Promise<ISiteSettings | null> {
    return this.updateSettings({ 
      layout: { ...(await this.getSettings()).layout, ...layout } 
    });
  }

  async updateContactInfo(contactInfo: {
    email?: string;
    phone?: string;
    address?: string;
  }): Promise<ISiteSettings | null> {
    return this.updateSettings({ 
      contactInfo: { ...(await this.getSettings()).contactInfo, ...contactInfo } 
    });
  }

  async updateSocialLinks(socialLinks: Array<{
    platform: string;
    url: string;
    icon?: string;
  }>): Promise<ISiteSettings | null> {
    return this.updateSettings({ socialLinks });
  }

  async updateSEO(seo: {
    defaultTitle?: string;
    defaultDescription?: string;
    defaultImage?: string;
  }): Promise<ISiteSettings | null> {
    return this.updateSettings({ 
      seo: { ...(await this.getSettings()).seo, ...seo } 
    });
  }

  async updateStoreSettings(storeSettings: {
    currency?: string;
    taxRate?: number;
    freeShippingThreshold?: number;
  }): Promise<ISiteSettings | null> {
    // currency / taxRate / freeShippingThreshold are top-level Settings
    // fields; merge with current values and persist only those three.
    return this.updateSettings({ ...storeSettings });
  }

  async incrementSetting(section: string, field: string, increment: number = 1): Promise<ISiteSettings | null> {
    const update = {};
    update[`${section}.${field}`] = increment;
    
    return this.updateSettings(update as Partial<ISiteSettings>);
  }
}
