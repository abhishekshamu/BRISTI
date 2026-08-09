import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  formatPrice as sharedFormatPrice,
  formatDate as sharedFormatDate,
  getInitials as sharedGetInitials,
  isValidEmail,
  slugify,
  truncateText,
  calculateReadingTime as sharedCalculateReadingTime,
} from '@shared/utils';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatPrice = sharedFormatPrice;
export const formatDate = sharedFormatDate;
export const getInitials = sharedGetInitials;
export const isValidEmailAddress = isValidEmail;
export const slugifyText = slugify;
export const truncateTextAt = truncateText;
export const calculateReadingTime = sharedCalculateReadingTime;

export function formatPriceFromCents(cents: number, currency = 'USD'): string {
  return sharedFormatPrice(cents / 100, currency);
}

// Origin that serves uploaded files (/uploads/*). Override in production via
// VITE_API_BASE_URL (preferred) or the legacy VITE_API_URL; defaults to the
// same origin so the Vite dev proxy / host serves the files.
const API_ORIGIN: string = String(
  (import.meta as any).env?.VITE_API_BASE_URL || (import.meta as any).env?.VITE_API_URL || '',
).replace(/\/+$/, '');

/**
 * Resolve an image URL for <img> use.
 * - Absolute http(s) URLs pointing at a dev host (localhost/127.0.0.1) are
 *   rewritten to the configured API origin — media stored while the backend
 *   ran locally embeds such URLs and they 404 everywhere else.
 * - Other absolute http(s) URLs are used unchanged (e.g. Cloudinary).
 * - Backend-served relative paths (/uploads/...) get the API origin prepended,
 *   otherwise they would resolve to the storefront origin and 404.
 * - Any other relative path is left untouched (frontend public assets).
 */
export function getImageUrl(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      const isDevHost =
        parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '0.0.0.0';
      if (isDevHost) {
        const path = parsed.pathname + parsed.search;
        return API_ORIGIN ? `${API_ORIGIN}${path}` : path;
      }
    } catch {
      /* fall through to default handling */
    }
    return url;
  }
  if (url.startsWith('/uploads/')) return API_ORIGIN ? `${API_ORIGIN}${url}` : url;
  if (url.startsWith('/')) return url;
  return url;
}

export function getProductImage(product: { images?: Array<{ url: string; alt?: string }> }): string | null {
  if (!product.images || product.images.length === 0) return null;
  const featured = product.images.find((i) => i.url);
  return getImageUrl((featured ?? product.images[0])?.url);
}

export function getDefaultVariant(product: {
  options?: Array<{ name: string; values: string[] }>;
  variants?: Array<{ id: string; options?: Record<string, string>; stock?: number }>;
}) {
  const variants = product.variants ?? [];
  if (variants.length === 0) return undefined;
  const defaults: Record<string, string> = {};
  for (const option of product.options ?? []) {
    if (option.values?.length) defaults[option.name] = option.values[0];
  }
  const matched = variants.find((variant) => Object.entries(defaults).every(([key, value]) => (variant.options ?? {})[key] === value));
  if (matched && (matched.stock ?? 0) > 0) return matched;
  return variants.find((variant) => (variant.stock ?? 0) > 0) ?? matched ?? variants[0];
}

export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const e = error as { response?: { data?: { message?: string } }; message?: string };
    if (e.response?.data?.message) return e.response.data.message;
    if (e.message) return e.message;
  }
  return 'Something went wrong. Please try again.';
}

export function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function getSessionId(): string {
  let id = localStorage.getItem('bristi_session_id');
  if (!id) {
    id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('bristi_session_id', id);
  }
  return id;
}

export function getBase64Dimensions(media: MediaEvent): { width?: number; height?: number } {
  const target = media.target as HTMLImageElement | undefined;
  return { width: target?.naturalWidth, height: target?.naturalHeight };
}

type MediaEvent = Event & { target: EventTarget | null };
