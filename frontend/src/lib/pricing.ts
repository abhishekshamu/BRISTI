import { DEFAULT_SETTINGS } from '@shared/constants';
import type { SiteSettings } from '@shared/types';

export const TAX_RATE = DEFAULT_SETTINGS.taxRate;
export const FREE_SHIPPING_THRESHOLD = DEFAULT_SETTINGS.freeShippingThreshold;
export const FLAT_SHIPPING_RATE = 15;

export interface TotalsOptions {
  taxRate?: number;
  freeShippingThreshold?: number;
  flatShippingRate?: number;
}

export function totalsOptionsFromSettings(settings: SiteSettings | null): TotalsOptions {
  return {
    taxRate: settings?.taxRate,
    freeShippingThreshold: settings?.freeShippingThreshold,
  };
}

export interface Totals {
  tax: number;
  shipping: number;
  total: number;
}

export function computeTotals(
  subtotal: number,
  discount = 0,
  itemCount = 0,
  options: TotalsOptions = {},
): Totals {
  const taxRate = options.taxRate ?? TAX_RATE;
  const freeShippingThreshold = options.freeShippingThreshold ?? FREE_SHIPPING_THRESHOLD;
  const flatShippingRate = options.flatShippingRate ?? FLAT_SHIPPING_RATE;
  const tax = subtotal * taxRate;
  const shipping = subtotal === 0 || itemCount === 0 ? 0 : subtotal >= freeShippingThreshold ? 0 : flatShippingRate;
  const total = subtotal + tax + shipping - discount;
  return { tax, shipping, total };
}