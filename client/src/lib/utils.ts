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

export function getImageUrl(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return url;
}

export function getProductImage(product: { images?: Array<{ url: string; alt?: string }> }): string | null {
  if (!product.images || product.images.length === 0) return null;
  const featured = product.images.find((i) => i.url);
  return getImageUrl((featured ?? product.images[0])?.url);
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
