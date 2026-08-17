// Shared Utilities

import {
  BRAND_FONTS,
  CURRENCY_LOCALES,
  DEFAULT_BASE_CURRENCY,
  DEFAULT_BRAND_TYPOGRAPHY,
  DEFAULT_EXCHANGE_RATES,
} from '../constants';
import type {
  BrandFontStyle,
  BrandNameTypography,
  BrandTextAlign,
  BrandTextDecoration,
  BrandTextTransform,
  BrandIdentity,
  SiteSettings,
} from '../types';

// Re-exported so backend/frontend consumers can import currency defaults from
// a single module.
export { DEFAULT_BASE_CURRENCY, DEFAULT_EXCHANGE_RATES };

/**
 * Exchange rate lookup: units of `to` currency per ONE unit of `from` currency.
 * `rates` (settings.exchangeRates) wins; otherwise the static fallback table
 * is used; unknown currencies resolve to 1 (no conversion).
 */
export const getCurrencyRate = (
  from: string,
  to: string,
  rates?: Record<string, number> | null,
): number => {
  const normalized = (code: string) => String(code ?? '').trim().toUpperCase();
  const source = normalized(from);
  const target = normalized(to);
  if (source === target) return 1;

  const table: Record<string, number> = { ...DEFAULT_EXCHANGE_RATES, ...(rates ?? {}) };
  const sourceRate = table[source] ?? 1;
  const targetRate = table[target] ?? 1;
  return targetRate / sourceRate;
};

/**
 * Central currency conversion. `amount` must ALWAYS be a base-currency amount
 * (database price / cart / order values) — never pass an already converted
 * display value into this function, or the value gets converted twice.
 */
export const convertPrice = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates?: Record<string, number> | null,
): number => {
  const n = Number(amount) || 0;
  if (!Number.isFinite(n) || n === 0) return 0;
  return n * getCurrencyRate(fromCurrency, toCurrency, rates);
};

const DEFAULT_CURRENCY_LOCALE = 'en-US';

/** Formats an amount in the given currency with Intl.NumberFormat (no manual symbol concatenation). */
export const formatPrice = (
  amount: number,
  currency: string = 'USD',
  locale?: string,
): string => {
  const code = String(currency ?? '').trim().toUpperCase() || 'USD';
  const resolvedLocale = locale || CURRENCY_LOCALES[code] || DEFAULT_CURRENCY_LOCALE;
  const zeroDecimals = code === 'JPY';
  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: zeroDecimals ? 0 : 2,
    maximumFractionDigits: zeroDecimals ? 0 : 2,
  }).format(Number(amount) || 0);
};

/**
 * Currency formatter bound to the site configuration. Amounts are expected in
 * the site's base currency; the value is converted once to the display
 * currency and then formatted.
 */
export const formatPriceIn = (
  amount: number,
  baseCurrency: string,
  displayCurrency: string,
  rates?: Record<string, number> | null,
  locale?: string,
): string => {
  const converted = convertPrice(amount, baseCurrency, displayCurrency, rates);
  return formatPrice(converted, displayCurrency, locale);
};

const DEFAULT_LOGO_PATHS = ['', '/logo.png', '/favicon.svg'];

const isDefaultLogo = (url?: string | null): boolean =>
  !url || DEFAULT_LOGO_PATHS.includes(url.trim());

const cleanUrl = (url?: string | null): string | null => {
  const value = String(url ?? '').trim();
  return value ? value : null;
};

/**
 * Normalizes brand identity with backward-compatible migration from the
 * legacy settings (brandName string + logo field).
 *
 * Migration rules:
 * - wordmark.text  ← brandName (or legacy wordmark text)
 * - wordmark.imageUrl ← legacy `logo` ONLY when it is a real uploaded asset
 *   (the legacy logo was rendered as the wordmark, so it migrates there — it
 *   is never bound to the brand icon at the same time).
 * - wordmark.mode  ← 'image' when a real wordmark image exists, else 'text'
 * - icon.imageUrl  ← its own field; never derived from the legacy logo.
 */
export function normalizeBrandIdentity(
  settings: Pick<SiteSettings, 'brandName' | 'logo'> & Partial<SiteSettings>,
): BrandIdentity {
  const legacyLogo = cleanUrl(settings?.logo);
  const saved = settings?.brandIdentity;

  const wordmarkText =
    cleanUrl(saved?.wordmark?.text) ??
    cleanUrl(settings?.brandName) ??
    'BRISTI';

  const savedWordmarkImage = cleanUrl(saved?.wordmark?.imageUrl);
  const imageUrl =
    savedWordmarkImage ??
    (isDefaultLogo(legacyLogo) ? null : legacyLogo);

  const explicitMode = saved?.wordmark?.mode;
  const mode =
    explicitMode === 'text' || explicitMode === 'image'
      ? explicitMode
      : imageUrl
        ? 'image'
        : 'text';

  return {
    wordmark: {
      mode,
      text: wordmarkText,
      imageUrl: mode === 'image' ? imageUrl : null,
    },
    icon: {
      imageUrl: cleanUrl(saved?.icon?.imageUrl),
    },
  };
}

/** Defaults used when the settings doc predates the new fields. */
export const defaultBrandIdentity = (brandName = 'BRISTI'): BrandIdentity => ({
  wordmark: { mode: 'text', text: brandName, imageUrl: null },
  icon: { imageUrl: null },
});

/* ============================================================
   Brand Name Typography (Text wordmark mode)
   ============================================================ */

const isFontStyle = (v: unknown): v is BrandFontStyle =>
  v === 'normal' || v === 'italic' || v === 'oblique';
const isTextTransform = (v: unknown): v is BrandTextTransform =>
  v === 'none' || v === 'uppercase' || v === 'lowercase' || v === 'capitalize';
const isTextDecoration = (v: unknown): v is BrandTextDecoration =>
  v === 'none' || v === 'underline' || v === 'overline' || v === 'line-through';
const isTextAlign = (v: unknown): v is BrandTextAlign =>
  v === 'left' || v === 'center' || v === 'right';
const isUnit = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;

/**
 * Normalizes a stored (possibly partial / legacy / malformed) typography
 * object into the full BrandNameTypography shape with sensible defaults, so
 * every consumer can rely on every field being present and CSS-ready.
 */
export function normalizeBrandNameTypography(
  raw?: Partial<BrandNameTypography> | null,
): BrandNameTypography {
  const d = DEFAULT_BRAND_TYPOGRAPHY;
  if (!raw || typeof raw !== 'object') return { ...d };

  const fontFamily = isUnit(raw.fontFamily) ? raw.fontFamily.trim() : d.fontFamily;
  const fontMeta = BRAND_FONTS.find((f) => f.family === fontFamily);

  let fontWeight = typeof raw.fontWeight === 'number' && Number.isFinite(raw.fontWeight)
    ? Math.min(900, Math.max(100, Math.round(raw.fontWeight)))
    : d.fontWeight;
  // Never advertise a weight the selected font cannot render.
  if (fontMeta && !fontMeta.weights.includes(fontWeight)) {
    fontWeight = fontMeta.weights.reduce(
      (best, wgt) => (Math.abs(wgt - fontWeight) < Math.abs(best - fontWeight) ? wgt : best),
      fontMeta.weights[0],
    );
  }

  return {
    fontFamily,
    fontWeight,
    fontSize: isUnit(raw.fontSize) ? raw.fontSize.trim() : d.fontSize,
    letterSpacing: isUnit(raw.letterSpacing) ? raw.letterSpacing.trim() : d.letterSpacing,
    lineHeight: isUnit(raw.lineHeight) ? raw.lineHeight.trim() : d.lineHeight,
    fontStyle: isFontStyle(raw.fontStyle) ? raw.fontStyle : d.fontStyle,
    textTransform: isTextTransform(raw.textTransform) ? raw.textTransform : d.textTransform,
    textDecoration: isTextDecoration(raw.textDecoration) ? raw.textDecoration : d.textDecoration,
    textAlign: isTextAlign(raw.textAlign) ? raw.textAlign : d.textAlign,
  };
}

/**
 * CSS font-family stack for a brand font with a graceful fallback chain:
 * system-ui for sans fonts, Georgia for serif/display fonts — a failed web
 * font request can never make the brand name invisible.
 */
export function getBrandFontStack(fontFamily: string): string {
  const clean = String(fontFamily || '').trim() || 'Inter';
  const meta = BRAND_FONTS.find((f) => f.family === clean);
  const isSerif = meta
    ? meta.categories.includes('serif') || meta.categories.includes('display')
    : /serif|garamond|display|didot|baskerville|prata|cinzel|marcellus|italiana|forum|oranienbaum|vidaloka|tenor|poiret|cormorant|fraunces|cardo|spectral|newsreader|playfair|merriweather|lora|sourceserif|libre/i.test(clean);
  return `${clean}, ${isSerif ? 'Georgia, "Times New Roman", serif' : 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'}`;
}

/**
 * Splits a CSS size like "32px" into { value, unit }. Returns null for
 * unrecognized values so callers can keep the raw string untouched.
 */
export function parseBrandFontSize(
  size: string,
): { value: number; unit: string } | null {
  const match = String(size ?? '').trim().match(/^(-?[\d.]+)(px|rem|em|%)$/i);
  if (!match) return null;
  return { value: parseFloat(match[1]), unit: match[2].toLowerCase() };
}

/**
 * Responsive brand font size: px values become a clamp() so a large desktop
 * wordmark scales down on small screens instead of breaking the header.
 * Relative units (rem/em/%) already scale with the theme, so they pass through.
 */
export function responsiveBrandFontSize(size: string): string {
  const parsed = parseBrandFontSize(size);
  if (!parsed || parsed.unit !== 'px') return size;
  const min = Math.round(parsed.value * 0.72 * 100) / 100;
  return `clamp(${min}px, 7vw, ${parsed.value}px)`;
}

interface GoogleFontRequest {
  family: string;
  weights?: number[];
  italic?: boolean;
}

/**
 * Builds a Google Fonts css2 URL for a small set of families — the storefront
 * loads ONLY the selected brand font (never the whole library).
 */
export function buildGoogleFontsUrl(fonts: GoogleFontRequest[]): string {
  const parts = fonts
    .filter((f) => f.family && f.family.trim())
    .map((f) => {
      const family = f.family.trim().replace(/\s+/g, '+');
      const weights = (f.weights ?? []).filter((weight) => Number.isFinite(weight) && weight >= 100 && weight <= 1000);
      const hasItalic = !!f.italic;
      if (weights.length === 0) return `family=${family}`;
      if (hasItalic) {
        const axes = [...new Set(weights)].map((weight) => `0,${weight};1,${weight}`).join(';');
        return `family=${family}:ital,wght@${axes}`;
      }
      return `family=${family}:wght@${[...new Set(weights)].join(';')}`;
    });
  if (parts.length === 0) return '';
  return `https://fonts.googleapis.com/css2?${parts.join('&')}&display=swap`;
}

/**
 * Format date to local string
 */
export const formatDate = (date: Date | string, options: Intl.DateTimeFormatOptions = {}): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(dateObj);
};

/**
 * Format date and time
 */
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
};

/**
 * Truncate text to specified length
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

/**
 * Slugify a string
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

/**
 * Format file size to human readable
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Generate random ID
 */
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

/**
 * Debounce function
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};

/**
 * Deep clone object
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj)) as T;
};

/**
 * Get initials from name
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Calculate discount percentage
 */
export const calculateDiscountPercentage = (originalPrice: number, salePrice: number): number => {
  if (originalPrice <= 0) return 0;
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
};

/**
 * Calculate savings amount
 */
export const calculateSavings = (originalPrice: number, salePrice: number): number => {
  return Math.max(0, originalPrice - salePrice);
};

/**
 * Check if object is empty
 */
export const isEmptyObject = (obj: Record<string, any>): boolean => {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
};

/**
 * Group array by key
 */
export const groupBy = <T, K extends keyof any>(
  array: T[],
  key: (item: T) => K
): Record<K, T[]> => {
  return array.reduce((result, item) => {
    const groupKey = key(item);
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {} as Record<K, T[]>);
};

/**
 * Get unique values from array based on key
 */
export const uniqBy = <T, K extends keyof T>(
  array: T[],
  key: (item: T) => T[K]
): T[] => {
  const seen = new Set();
  return array.filter(item => {
    const k = key(item);
    return seen.has(k) ? false : seen.add(k);
  });
};

/**
 * Deep merge objects
 */
export const deepMerge = <T extends object>(target: T, source: Partial<T>): T => {
  const output: T = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      const sourceValue = (source as Record<string, any>)[key];
      if (isObject(sourceValue)) {
        if (!(key in (output as Record<string, any>))) {
          (output as Record<string, any>)[key] = {};
        }
        (output as Record<string, any>)[key] = deepMerge(
          Object.assign({}, (target as Record<string, any>)[key]),
          sourceValue,
        );
      } else {
        (output as Record<string, any>)[key] = sourceValue;
      }
    });
  }
  
  return output;
};

const isObject = (item: any): boolean => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

/**
 * Calculate reading time for text
 */
export const calculateReadingTime = (text: string, wpm: number = 200): number => {
  const wordsPerMinute = wpm;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
};

/**
 * Get YouTube video ID from URL
 */
export const getYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
};

/**
 * Get Vimeo video ID from URL
 */
export const getVimeoVideoId = (url: string): string | null => {
  const regExp = /https?:\/\/(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/([^/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
  const match = url.match(regExp);
  return match ? match[3] : null;
};

/**
 * Validate email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate URL
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Format phone number (US format)
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy text: ', err);
    return false;
  }
};

/**
 * Download file from blob
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

/**
 * Generate color variants
 */
export const generateColorVariants = (hexColor: string): { light: string; lighter: string; dark: string; darker: string } => {
  // Remove # if present
  const cleanHex = hexColor.replace('#', '');
  
  // Convert hex to rgb
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  // Lighten by 20%
  const light = `rgb(${Math.min(255, Math.floor(r * 1.2))}, ${Math.min(255, Math.floor(g * 1.2))}, ${Math.min(255, Math.floor(b * 1.2))})`;
  
  // Lighten by 40%
  const lighter = `rgb(${Math.min(255, Math.floor(r * 1.4))}, ${Math.min(255, Math.floor(g * 1.4))}, ${Math.min(255, Math.floor(b * 1.4))})`;
  
  // Darken by 20%
  const dark = `rgb(${Math.max(0, Math.floor(r * 0.8))}, ${Math.max(0, Math.floor(g * 0.8))}, ${Math.max(0, Math.floor(b * 0.8))})`;
  
  // Darken by 40%
  const darker = `rgb(${Math.max(0, Math.floor(r * 0.6))}, ${Math.max(0, Math.floor(g * 0.6))}, ${Math.max(0, Math.floor(b * 0.6))})`;
  
  return { light, lighter, dark, darker };
};

/**
 * Wait for specified milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Get query parameter from URL
 */
export const getQueryParam = (param: string, url: string = window.location.href): string | null => {
  const urlObj = new URL(url);
  return urlObj.searchParams.get(param);
};

/**
 * Update query parameter in URL
 */
export const updateQueryParam = (param: string, value: string | null): void => {
  const url = new URL(window.location.href);
  if (value === null) {
    url.searchParams.delete(param);
  } else {
    url.searchParams.set(param, value);
  }
  window.history.pushState({}, '', url);
};

/**
 * Calculate distance between two points (Haversine formula)
 */
export const calculateDistance = (
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

/**
 * Generate avatar color based on string
 */
export const getAvatarColor = (string: string): string => {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 40%)`;
};

/**
 * Validate file type
 */
export const isValidFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

/**
 * Validate file size
 */
export const isValidFileSize = (file: File, maxSizeInBytes: number): boolean => {
  return file.size <= maxSizeInBytes;
};

/**
 * Detect the aspect ratio (as a simplified "w:h" string) from pixel dimensions.
 * Never mutates the source; purely informational. Returns null when unknown
 * (SVGs, videos, or missing dimensions) so callers can show "Free".
 */
export const detectRatio = (width?: number | null, height?: number | null): string | null => {
  if (!width || !height || width <= 0 || height <= 0) return null;
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(Math.round(width), Math.round(height));
  if (g === 0) return null;
  return `${Math.round(width) / g}:${Math.round(height) / g}`;
};