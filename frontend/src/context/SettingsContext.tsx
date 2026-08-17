import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { siteService } from '@/services/site.service';
import { organizationJsonLd, setJsonLd } from '@/lib/seo';
import { getImageUrl } from '@/lib/utils';
import { DEFAULT_SETTINGS } from '@shared/constants';
import { normalizeBrandIdentity } from '@shared/utils';
import type { BrandIdentity, SiteSettings } from '@shared/types';

const SETTINGS_CACHE_KEY = 'bristi.settings.cache.v1';

interface SettingsContextValue {
  settings: SiteSettings | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function hexToHslTriplet(hex: string): string | null {
  const cleaned = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return null;
  const r = parseInt(cleaned.slice(0, 2), 16) / 255;
  const g = parseInt(cleaned.slice(2, 4), 16) / 255;
  const b = parseInt(cleaned.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const FONT_FALLBACKS: Record<string, string> = {
  'Inter': 'Inter, sans-serif',
  'Cormorant Garamond': 'Cormorant Garamond, serif',
  'Playfair Display': 'Playfair Display, serif',
  'Montserrat': 'Montserrat, sans-serif',
  'Poppins': 'Poppins, sans-serif',
  'Lato': 'Lato, sans-serif',
  'Open Sans': 'Open Sans, sans-serif',
  'Merriweather': 'Merriweather, serif',
  'Georgia': 'Georgia, serif',
};

function fontStack(font: string, fallback: string): string {
  if (!font) return fallback;
  const base = FONT_FALLBACKS[font] || `${font}, sans-serif`;
  return base;
}

function applySettingsToDom(settings: SiteSettings | null): void {
  if (!settings) return;
  const root = document.documentElement;

  // Branding: title, description, favicon
  if (settings.seo?.defaultTitle) {
    document.title = settings.seo.defaultTitle;
  }
  let metaDesc = document.querySelector('meta[name="description"]');
  if (settings.seo?.defaultDescription) {
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', settings.seo.defaultDescription);
  }
  const faviconUrl = getImageUrl(settings.favicon);
  if (faviconUrl) {
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = faviconUrl;
  }

  // Colors → shadcn HSL variables (only when a hex value is provided)
  const colorMap: Array<[keyof SiteSettings['colors'], string]> = [
    ['background', '--background'],
    ['primary', '--primary'],
    ['text', '--foreground'],
    ['accent', '--accent'],
    ['accent', '--ring'],
  ];
  for (const [key, cssVar] of colorMap) {
    const value = settings.colors?.[key];
    if (value) {
      const triplet = hexToHslTriplet(value);
      if (triplet) root.style.setProperty(cssVar, triplet);
    }
  }

  // Typography: heading + body fonts + base size
  if (settings.typography?.headingFont) {
    root.style.setProperty('--font-heading', fontStack(settings.typography.headingFont, 'Cormorant Garamond, serif'));
  }
  if (settings.typography?.bodyFont) {
    root.style.setProperty('--font-body', fontStack(settings.typography.bodyFont, 'Inter, sans-serif'));
  }
  if (settings.typography?.baseSize) {
    root.style.fontSize = settings.typography.baseSize;
  }

  // Load fonts (Google Fonts link injected once)
  const fonts: string[] = [];
  if (settings.typography?.headingFont && !FONT_FALLBACKS[settings.typography.headingFont]) {
    fonts.push(settings.typography.headingFont);
  }
  if (settings.typography?.bodyFont && !FONT_FALLBACKS[settings.typography.bodyFont]) {
    fonts.push(settings.typography.bodyFont);
  }
  if (fonts.length > 0) {
    const existing = document.getElementById('settings-fonts') as HTMLLinkElement | null;
    const family = fonts.map((f) => f.replace(/ /g, '+')).join('&family=');
    if (existing) {
      existing.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
    } else {
      const link = document.createElement('link');
      link.id = 'settings-fonts';
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
      document.head.appendChild(link);
    }
  }
}

function loadCachedSettings(): SiteSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SiteSettings;
    return parsed && typeof parsed === 'object' && parsed.brandName ? parsed : null;
  } catch {
    return null;
  }
}

function cacheSettings(settings: SiteSettings): void {
  try {
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable — settings simply re-fetch next load
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings | null>(() => loadCachedSettings());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await siteService.getSettings();
      setSettings(data);
      applySettingsToDom(data);
      cacheSettings(data);
      const identity = normalizeBrandIdentity(data);
      setJsonLd(
        organizationJsonLd({
          brandName: identity.wordmark.text,
          slogan: data.slogan,
          logo: identity.wordmark.imageUrl ?? data.logo,
        }),
      );
    } catch {
      // Keep current (static) theme when the API is unavailable
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep storefront settings fresh (currency, brand, favicon, colors): when the
  // admin saves settings and the shop tab regains focus, the latest values are
  // re-fetched — no stale currency survives an admin change.
  useEffect(() => {
    const onFocus = () => {
      refresh();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSiteSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSiteSettings must be used within a SettingsProvider');
  return context;
}

export function useBrandName(): string {
  const { settings } = useSiteSettings();
  return settings?.brandName || DEFAULT_SETTINGS.brandName;
}

/**
 * Normalized brand identity (wordmark + icon) with legacy-data fallbacks.
 * Single source of truth for every brand render (header, mobile nav, footer).
 */
export function useBrandIdentity(): BrandIdentity {
  const { settings } = useSiteSettings();
  return normalizeBrandIdentity(settings ?? { brandName: DEFAULT_SETTINGS.brandName, logo: '' });
}
