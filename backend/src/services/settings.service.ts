import { SettingsRepository } from '../repositories/settings.repository';
import { ISiteSettings } from '../../shared/types';
import {
  DEFAULT_BASE_CURRENCY,
  DEFAULT_EXCHANGE_RATES,
  normalizeBrandIdentity,
} from '../../shared/utils';

export class SettingsService {
  constructor(private settingsRepo: SettingsRepository) {}

  /**
   * Backward-compatible migration for brand identity: fills the new
   * brandIdentity/baseCurrency/exchangeRates fields from legacy data without
   * mutating the stored document. The legacy `logo` is treated as the wordmark
   * image only — it is never bound to the brand icon.
   */
  private decorate(settings: ISiteSettings): any {
    const sanitized: any = settings && typeof (settings as any).toObject === 'function'
      ? (settings as any).toObject()
      : { ...(settings as any) };

    sanitized.brandIdentity = normalizeBrandIdentity(sanitized);
    sanitized.baseCurrency = String(sanitized.baseCurrency || DEFAULT_BASE_CURRENCY).toUpperCase();
    sanitized.exchangeRates = {
      ...DEFAULT_EXCHANGE_RATES,
      ...(sanitized.exchangeRates && typeof sanitized.exchangeRates === 'object'
        ? sanitized.exchangeRates
        : {}),
    };
    return sanitized;
  }

  // Public settings: strip any secrets so the storefront never receives credentials
  async getPublicSettings(): Promise<any> {
    const settings = await this.settingsRepo.getSettings();
    const sanitized = this.decorate(settings);

    if (sanitized.emailSettings) {
      sanitized.emailSettings = {
        fromName: sanitized.emailSettings.fromName,
        fromEmail: sanitized.emailSettings.fromEmail,
        replyTo: sanitized.emailSettings.replyTo,
      };
    }
    if (sanitized.securitySettings) {
      sanitized.securitySettings = undefined;
    }
    return sanitized;
  }

  async getSettings(): Promise<ISiteSettings> {
    const settings = await this.settingsRepo.getSettings();
    return this.decorate(settings);
  }

  async updateSettings(data: Partial<ISiteSettings>): Promise<ISiteSettings> {
    return this.settingsRepo.updateSettings(data);
  }

  async updateBranding(data: {
    brandName?: string;
    logo?: string;
    favicon?: string;
    slogan?: string;
  }): Promise<ISiteSettings> {
    return this.settingsRepo.updateBranding(data);
  }

  async updateColors(data: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
    accent?: string;
  }): Promise<ISiteSettings> {
    return this.settingsRepo.updateColors(data);
  }

  async updateTypography(data: {
    headingFont?: string;
    bodyFont?: string;
    baseSize?: string;
  }): Promise<ISiteSettings> {
    return this.settingsRepo.updateTypography(data);
  }

  async updateLayout(data: {
    headerStyle?: string;
    footerStyle?: string;
  }): Promise<ISiteSettings> {
    return this.settingsRepo.updateLayout(data);
  }

  async updateContactInfo(data: {
    email?: string;
    phone?: string;
    address?: string;
  }): Promise<ISiteSettings> {
    return this.settingsRepo.updateContactInfo(data);
  }

  async updateSocialLinks(data: Array<{
    platform: string;
    url: string;
    icon?: string;
  }>): Promise<ISiteSettings> {
    return this.settingsRepo.updateSocialLinks(data);
  }

  async updateSEO(data: {
    defaultTitle?: string;
    defaultDescription?: string;
    defaultImage?: string;
  }): Promise<ISiteSettings> {
    return this.settingsRepo.updateSEO(data);
  }

  async updateStoreSettings(data: {
    currency?: string;
    taxRate?: number;
    freeShippingThreshold?: number;
  }): Promise<ISiteSettings> {
    return this.settingsRepo.updateStoreSettings(data);
  }

  async updateContact(data: Partial<ISiteSettings>): Promise<ISiteSettings> {
    return this.updateSettings({ contactInfo: { ...(await this.getSettings()).contactInfo, ...data } });
  }
}

