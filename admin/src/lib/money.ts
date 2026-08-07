/**
 * Currency formatting — driven by the site Settings (Settings.currency),
 * defaulting to USD so nothing is hard-coded at call sites.
 */

import api from './api';

const SYMBOLS: Record<string, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
  SGD: 'S$',
  AED: 'د.إ',
};

let currentSymbol: string | null = null;
let parsePromise: Promise<void> | null = null;

async function loadSymbol(): Promise<void> {
  try {
    const res = await api.get('/settings');
    const settings = res.data?.data;
    if (settings && settings.currency) {
      currentSymbol = SYMBOLS[settings.currency] ?? settings.currency;
    }
  } catch {
    /* settings unreachable — stay on default */
  }
  if (!currentSymbol) currentSymbol = '$';
}

/** Fetches the configured currency once and caches it for the app lifetime. */
export function ensureCurrencyLoaded(): Promise<void> {
  if (currentSymbol) return Promise.resolve();
  if (!parsePromise) {
    parsePromise = loadSymbol().finally(() => { parsePromise = null; });
  }
  return parsePromise;
}

/** Formats an amount in the admin-configured store currency. */
export function formatMoney(value: number | null | undefined, decimals = 0): string {
  const n = Number(value ?? 0);
  return `${currentSymbol ?? '$'}${n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** Symbol for prefixing inline (e.g. table headers, chart tooltips). */
export function moneySymbol(): string {
  return currentSymbol ?? '$';
}