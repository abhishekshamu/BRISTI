import { DEFAULT_SETTINGS } from '@shared/constants';

export const TAX_RATE = DEFAULT_SETTINGS.taxRate;
export const FREE_SHIPPING_THRESHOLD = DEFAULT_SETTINGS.freeShippingThreshold;
export const FLAT_SHIPPING_RATE = 15;

export interface Totals {
  tax: number;
  shipping: number;
  total: number;
}

export function computeTotals(subtotal: number, discount = 0, itemCount = 0): Totals {
  const tax = subtotal * TAX_RATE;
  const shipping = subtotal === 0 || itemCount === 0 ? 0 : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_RATE;
  const total = subtotal + tax + shipping - discount;
  return { tax, shipping, total };
}
