import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import {
  convertPrice as sharedConvertPrice,
  formatPrice as sharedFormatPrice,
  DEFAULT_BASE_CURRENCY,
} from '@shared/utils';
import { CURRENCY_LOCALES, DEFAULT_SETTINGS } from '@shared/constants';
import { useSiteSettings } from '@/context/SettingsContext';

interface CurrencyContextValue {
  /** Currency shown across the storefront (admin Settings > Currency). */
  currency: string;
  /** Currency product/cart/order amounts are stored in (database). */
  baseCurrency: string;
  /** Exchange rates (1 unit of base → X units of target). Settings overrides win. */
  rates: Record<string, number>;
  /** Conversion factor applied to base amounts to produce display amounts. */
  rate: number;
  /** Converts a BASE amount to the display currency. Never pass a converted value. */
  convert: (amount: number) => number;
  /** Converts a BASE amount to an explicit target currency. */
  convertTo: (amount: number, toCurrency: string) => number;
  /**
   * Formats a BASE amount in the display currency (converts once, then
   * formats with Intl.NumberFormat). This is the single entry point every
   * price-rendering component uses — never string-replace symbols manually.
   */
  formatPrice: (amount: number) => string;
  /** Formats an ALREADY-CONVERTED display amount (no conversion applied). */
  formatConverted: (amount: number) => string;
  /** Formats a BASE amount in the base currency (no conversion). */
  formatBase: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

function resolveRates(settingsRates: unknown): Record<string, number> {
  if (settingsRates && typeof settingsRates === 'object') {
    const out: Record<string, number> = {};
    for (const [code, value] of Object.entries(settingsRates as Record<string, unknown>)) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) out[code.toUpperCase()] = n;
    }
    return out;
  }
  return {};
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { settings } = useSiteSettings();

  const baseCurrency = String(settings?.baseCurrency || DEFAULT_BASE_CURRENCY).toUpperCase();
  const currency = String(settings?.currency || DEFAULT_SETTINGS.currency || DEFAULT_BASE_CURRENCY).toUpperCase();
  const rates = useMemo(() => resolveRates(settings?.exchangeRates), [settings?.exchangeRates]);
  const rate = sharedConvertPrice(1, baseCurrency, currency, rates);

  const convert = useCallback(
    (amount: number) => sharedConvertPrice(amount, baseCurrency, currency, rates),
    [baseCurrency, currency, rates],
  );

  const convertTo = useCallback(
    (amount: number, toCurrency: string) =>
      sharedConvertPrice(amount, baseCurrency, String(toCurrency || currency).toUpperCase(), rates),
    [baseCurrency, currency, rates],
  );

  const formatPrice = useCallback(
    (amount: number) => {
      const converted = sharedConvertPrice(amount, baseCurrency, currency, rates);
      return sharedFormatPrice(converted, currency, CURRENCY_LOCALES[currency]);
    },
    [baseCurrency, currency, rates],
  );

  const formatConverted = useCallback(
    (amount: number) => sharedFormatPrice(amount, currency, CURRENCY_LOCALES[currency]),
    [currency],
  );

  const formatBase = useCallback(
    (amount: number) => sharedFormatPrice(amount, baseCurrency, CURRENCY_LOCALES[baseCurrency]),
    [baseCurrency],
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({ currency, baseCurrency, rates, rate, convert, convertTo, formatPrice, formatConverted, formatBase }),
    [currency, baseCurrency, rates, rate, convert, convertTo, formatPrice, formatConverted, formatBase],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within a CurrencyProvider');
  return context;
}
