import type {
  ThemeSettings,
  ThemeTypography,
  ThemeButtons,
  ThemeHeaderConfig,
  ThemeFooterConfig,
  ThemeEffects,
} from '../types';

export const FONT_OPTIONS = [
  'Cormorant Garamond',
  'Playfair Display',
  'Georgia',
  'Merriweather',
  'Inter',
  'Montserrat',
  'Poppins',
  'Lato',
  'Open Sans',
] as const;

export const FONT_FALLBACKS: Record<string, string> = {
  'Cormorant Garamond': 'Cormorant Garamond, serif',
  'Playfair Display': 'Playfair Display, serif',
  'Georgia': 'Georgia, serif',
  'Merriweather': 'Merriweather, serif',
  'Inter': 'Inter, sans-serif',
  'Montserrat': 'Montserrat, sans-serif',
  'Poppins': 'Poppins, sans-serif',
  'Lato': 'Lato, sans-serif',
  'Open Sans': 'Open Sans, sans-serif',
};

export function fontStack(font: string): string {
  if (!font) return 'Inter, sans-serif';
  return FONT_FALLBACKS[font] || `${font}, sans-serif`;
}

const DEFAULT_COLORS: Record<string, string> = {
  // Brand & base palette (shadcn semantic tokens)
  background: '#FFFFFF',
  foreground: '#121212',
  primary: '#0D0D0D',
  primaryForeground: '#FAFAFA',
  secondary: '#F4F4F4',
  secondaryForeground: '#171717',
  accent: '#C9A227',
  accentForeground: '#FFFFFF',
  muted: '#F4F4F4',
  mutedForeground: '#737373',
  card: '#FFFFFF',
  cardForeground: '#121212',
  popover: '#FFFFFF',
  popoverForeground: '#121212',
  border: '#E5E5E5',
  input: '#DEDEDE',
  ring: '#C9A227',
  destructive: '#DC2626',
  destructiveForeground: '#FAFAFA',
  success: '#059669',
  gold: '#C9A227',

  // Dark luxury surfaces
  ink: '#0A0A0A',
  inkSoft: '#1A1A1A',
  inkMuted: '#0D0D0D',
  goldLight: '#F5D061',
  goldDark: '#8A6D1D',
  onInk: '#FFFFFF',
  onInkMuted: 'rgba(255, 255, 255, 0.35)',
  onInkDim: 'rgba(255, 255, 255, 0.60)',
  onInkFaint: 'rgba(255, 255, 255, 0.18)',
  ice: '#FFFFFF',
  backdrop: 'rgba(0, 0, 0, 0.60)',
  backdropStrong: 'rgba(0, 0, 0, 0.70)',
  imageOverlay: 'rgba(0, 0, 0, 0.50)',

  // Header
  headerBackground: '#FFFFFF',
  headerText: '#121212',
  headerTextHover: '#C9A227',
  headerBorder: '#E5E5E5',
  headerAccent: '#C9A227',
  headerDropdownBg: '#FFFFFF',
  headerDropdownText: '#121212',

  // Announcement bar
  announcementBackground: '#0A0A0A',
  announcementText: '#FFFFFF',
  announcementAccent: '#F5D061',

  // Navigation
  navBackground: '#FFFFFF',
  navText: '#0D0D0D',
  navHover: '#C9A227',
  navActive: '#C9A227',
  navSubmenuBg: '#FFFFFF',
  navSubmenuText: '#0D0D0D',
  navMobileBg: '#0A0A0A',
  navMobileText: '#FFFFFF',

  // Footer
  footerBackground: '#FFFFFF',
  footerText: '#737373',
  footerHeading: '#121212',
  footerLink: '#737373',
  footerLinkHover: '#C9A227',
  footerBorder: '#E5E5E5',

  // Product cards
  productCardBg: '#FFFFFF',
  productBadgeBg: '#0D0D0D',
  productBadgeText: '#FFFFFF',
  productPrice: '#0D0D0D',
  productTitle: '#0D0D0D',
  productBrand: '#737373',
  productSale: '#DC2626',
  productOverlayBg: '#0D0D0D',
  productOverlayText: '#FFFFFF',

  // Forms
  formBg: '#FFFFFF',
  formText: '#0D0D0D',
  formPlaceholder: '#737373',
  formBorder: '#DEDEDE',
  formFocus: '#C9A227',

  // Hero
  heroBackground: '#0A0A0A',
  heroText: '#FFFFFF',
  heroSubtext: 'rgba(255, 255, 255, 0.65)',
  heroAccent: '#C9A227',
  heroOverlayA: '#1A1A1A',
  heroOverlayB: '#0D0D0D',
  heroGlowColor: '#C9A227',

  // Collection
  collectionBackground: '#FFFFFF',
  collectionText: '#0D0D0D',
  collectionAccent: '#C9A227',
  collectionOverlay: 'rgba(0, 0, 0, 0.45)',
  collectionTitle: '#FFFFFF',
  collectionDesc: 'rgba(255, 255, 255, 0.60)',

  // Homepage featured category cards → --featured-category-border
  featuredCategoryBorder: '#E5E5E5',

  // Shop
  shopBackground: '#FFFFFF',
  shopText: '#0D0D0D',
  shopAccent: '#C9A227',
  shopFilterBg: '#FFFFFF',
  shopFilterBorder: '#E5E5E5',
  shopFilterText: '#0D0D0D',

  // Product page
  productPageBackground: '#FFFFFF',
  productPageText: '#0D0D0D',
  productPageAccent: '#C9A227',
  productPriceColor: '#0D0D0D',
  productSaleColor: '#DC2626',
  productTabBg: '#F4F4F4',
  productTabActiveBg: '#0D0D0D',
  productTabText: '#FFFFFF',

  // Cart
  cartBackground: '#FFFFFF',
  cartText: '#0D0D0D',
  cartAccent: '#C9A227',
  cartSummaryBg: '#F7F7F7',
  cartSummaryBorder: '#E5E5E5',

  // Checkout
  checkoutBackground: '#FFFFFF',
  checkoutText: '#0D0D0D',
  checkoutAccent: '#C9A227',
  checkoutInputBg: '#FFFFFF',
  checkoutInputBorder: '#DEDEDE',

  // Blog
  blogBackground: '#FFFFFF',
  blogText: '#0D0D0D',
  blogAccent: '#C9A227',
  blogCardBg: '#FFFFFF',
  blogCardBorder: '#E5E5E5',

  // CMS pages
  cmsBackground: '#FFFFFF',
  cmsText: '#0D0D0D',
  cmsAccent: '#C9A227',
  cmsHeading: '#0D0D0D',
  cmsLink: '#C9A227',

  // Account
  accountBackground: '#FFFFFF',
  accountText: '#0D0D0D',
  accountAccent: '#C9A227',
  accountCardBg: '#FFFFFF',

  // Wishlist
  wishlistBackground: '#FFFFFF',
  wishlistText: '#0D0D0D',
  wishlistAccent: '#C9A227',

  // Search
  searchBackground: '#FFFFFF',
  searchText: '#0D0D0D',
  searchAccent: '#C9A227',
  searchOverlay: 'rgba(0, 0, 0, 0.50)',
  searchResultBg: '#FFFFFF',

  // Mobile
  mobileDrawerBg: '#FFFFFF',
  mobileDrawerText: '#121212',
  mobileNavBg: '#FFFFFF',
  mobileNavBorder: '#E5E5E5',
};

const DEFAULT_TYPOGRAPHY: ThemeTypography = {
  headingFont: 'Cormorant Garamond',
  bodyFont: 'Inter',
  baseSize: { desktop: 16, tablet: 15, mobile: 14 },
  headingSizes: {
    h1: { desktop: 64, tablet: 52, mobile: 40 },
    h2: { desktop: 44, tablet: 36, mobile: 30 },
    h3: { desktop: 32, tablet: 28, mobile: 24 },
    h4: { desktop: 24, tablet: 22, mobile: 20 },
    h5: { desktop: 20, tablet: 18, mobile: 17 },
    small: { desktop: 14, tablet: 13, mobile: 12 },
    eyebrow: { desktop: 11, tablet: 11, mobile: 10 },
  },
  headingWeight: 500,
  bodyWeight: 400,
  headingTransform: 'none',
  headingLineHeight: 1.15,
  bodyLineHeight: 1.6,
  headingLetterSpacing: '0em',
  eyebrowTransform: 'uppercase',
  eyebrowLetterSpacing: '0.35em',
};

const DEFAULT_BUTTONS: ThemeButtons = {
  borderRadius: '0px',
  paddingX: '2rem',
  paddingY: '1rem',
  fontSize: '12px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.2em',
  primaryBg: '#0D0D0D',
  primaryText: '#FFFFFF',
  primaryHoverBg: '#121212',
  goldBg: '#C9A227',
  goldText: '#FFFFFF',
  goldHoverBg: '#B08D1D',
  outlineText: '#0D0D0D',
  outlineBorder: 'rgba(0, 0, 0, 0.40)',
  outlineHoverBg: '#0D0D0D',
  outlineHoverText: '#FFFFFF',
  ghostText: '#0D0D0D',
  whiteBg: '#FFFFFF',
  whiteText: '#000000',
  whiteHoverBg: 'rgba(255, 255, 255, 0.85)',
};

const DEFAULT_HEADER: ThemeHeaderConfig = {
  height: '80px',
  sticky: true,
  showAnnouncementBar: true,
};

const DEFAULT_FOOTER: ThemeFooterConfig = {
  paddingY: '64px',
};

const DEFAULT_EFFECTS: ThemeEffects = {
  radiusSm: '0px',
  radiusMd: '0px',
  radiusLg: '0px',
  shadowSm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.10), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.10), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  marqueeDuration: '32s',
};

const DEFAULT_PRESET = {
  colors: DEFAULT_COLORS,
  typography: DEFAULT_TYPOGRAPHY,
  buttons: DEFAULT_BUTTONS,
  header: DEFAULT_HEADER,
  footer: DEFAULT_FOOTER,
  effects: DEFAULT_EFFECTS,
};

const DARK_OVERRIDE: ThemePresetShape = {
  isDark: true,
  colors: {
    background: '#0A0A0A',
    foreground: '#F5F5F5',
    primary: '#F5F5F5',
    primaryForeground: '#0A0A0A',
    secondary: '#1A1A1A',
    secondaryForeground: '#EBEBEB',
    muted: '#1A1A1A',
    mutedForeground: '#999999',
    card: '#111111',
    cardForeground: '#F5F5F5',
    popover: '#101010',
    popoverForeground: '#F5F5F5',
    border: '#262626',
    input: '#333333',
    headerBackground: '#0A0A0A',
    headerText: '#F5F5F5',
    headerBorder: '#262626',
    headerDropdownBg: '#111111',
    headerDropdownText: '#F5F5F5',
    navBackground: '#0A0A0A',
    navText: '#F5F5F5',
    navSubmenuBg: '#111111',
    navSubmenuText: '#F5F5F5',
    navMobileBg: '#0A0A0A',
    productCardBg: '#111111',
    productPrice: '#F5F5F5',
    productTitle: '#F5F5F5',
    productBrand: '#999999',
    productOverlayBg: '#F5F5F5',
    productOverlayText: '#0A0A0A',
    formBg: '#111111',
    formText: '#F5F5F5',
    formBorder: '#333333',
    collectionBackground: '#0A0A0A',
    collectionText: '#F5F5F5',
    shopBackground: '#0A0A0A',
    shopText: '#F5F5F5',
    shopFilterBg: '#111111',
    shopFilterBorder: '#262626',
    shopFilterText: '#F5F5F5',
    productPageBackground: '#0A0A0A',
    productPageText: '#F5F5F5',
    productTabBg: '#1A1A1A',
    productTabActiveBg: '#F5F5F5',
    productTabText: '#0A0A0A',
    cartBackground: '#0A0A0A',
    cartText: '#F5F5F5',
    cartSummaryBg: '#111111',
    cartSummaryBorder: '#262626',
    checkoutBackground: '#0A0A0A',
    checkoutText: '#F5F5F5',
    checkoutInputBg: '#111111',
    checkoutInputBorder: '#333333',
    blogBackground: '#0A0A0A',
    blogText: '#F5F5F5',
    blogCardBg: '#111111',
    blogCardBorder: '#262626',
    cmsBackground: '#0A0A0A',
    cmsText: '#F5F5F5',
    cmsHeading: '#F5F5F5',
    accountBackground: '#0A0A0A',
    accountText: '#F5F5F5',
    accountCardBg: '#111111',
    wishlistBackground: '#0A0A0A',
    wishlistText: '#F5F5F5',
    searchBackground: '#0A0A0A',
    searchText: '#F5F5F5',
    searchResultBg: '#111111',
    featuredCategoryBorder: '#262626',
    mobileDrawerBg: '#0A0A0A',
    mobileNavBg: '#0A0A0A',
    mobileNavBorder: '#262626',
    footerBackground: '#0A0A0A',
    footerText: '#A3A3A3',
    footerHeading: '#FFFFFF',
    footerLink: '#A3A3A3',
    footerLinkHover: '#C9A227',
    footerBorder: '#262626',
    announcementBackground: '#111111',
  },
  buttons: {
    primaryBg: '#F5F5F5',
    primaryText: '#0A0A0A',
    primaryHoverBg: '#E5E5E5',
    outlineText: '#F5F5F5',
    outlineBorder: 'rgba(255, 255, 255, 0.40)',
    outlineHoverBg: '#F5F5F5',
    outlineHoverText: '#0A0A0A',
    ghostText: '#F5F5F5',
    whiteBg: '#FFFFFF',
    whiteText: '#0A0A0A',
  },
};

const LIGHT_OVERRIDE: ThemePresetShape = {
  isDark: false,
};

export interface ThemePresetShape {
  isDark?: boolean;
  colors?: Record<string, string>;
  typography?: Partial<ThemeTypography>;
  buttons?: Partial<ThemeButtons>;
  header?: Partial<ThemeHeaderConfig>;
  footer?: Partial<ThemeFooterConfig>;
  effects?: Partial<ThemeEffects>;
}

function deepMerge<T>(base: T, override: any): T {
  if (override === undefined || override === null) return base;
  if (Array.isArray(base) || typeof base !== 'object') return (override as T);
  const result: any = { ...(base as any) };
  for (const key of Object.keys(override)) {
    const baseValue = (base as any)[key];
    const overrideValue = override[key];
    if (
      baseValue &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue) &&
      overrideValue &&
      typeof overrideValue === 'object' &&
      !Array.isArray(overrideValue)
    ) {
      result[key] = deepMerge(baseValue, overrideValue);
    } else {
      result[key] = overrideValue;
    }
  }
  return result;
}

export const themePresets: Record<'default' | 'dark' | 'light', ThemePresetShape> = {
  default: DEFAULT_PRESET,
  dark: DARK_OVERRIDE,
  light: LIGHT_OVERRIDE,
};

export type ThemePresetName = keyof typeof themePresets;

export interface FullThemePreset {
  isDark: boolean;
  colors: Record<string, string>;
  typography: ThemeTypography;
  buttons: ThemeButtons;
  header: ThemeHeaderConfig;
  footer: ThemeFooterConfig;
  effects: ThemeEffects;
}

export function resolvePreset(name: ThemePresetName): FullThemePreset {
  return deepMerge(DEFAULT_PRESET, themePresets[name] || {}) as FullThemePreset;
}

export function mergeThemeWithDefaults(partial: Partial<ThemeSettings> | null | undefined): ThemeSettings {
  const merged = deepMerge(DEFAULT_PRESET, partial || {});
  return {
    _id: (partial as any)?.id || (partial as any)?._id || '',
    name: (partial as any)?.name || 'Default',
    isActive: (partial as any)?.isActive ?? false,
    isDark: (partial as any)?.isDark ?? false,
    colors: merged.colors,
    typography: merged.typography,
    buttons: merged.buttons,
    header: merged.header,
    footer: merged.footer,
    effects: merged.effects,
  };
}
