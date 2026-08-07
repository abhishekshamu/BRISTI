import type { ThemeSettings } from '@shared/types';
import { fontStack } from '@shared/theme';

function camelToKebab(key: string): string {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function hexToHslTriplet(hex: string): string | null {
  const cleaned = (hex || '').replace('#', '');
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

// Base palette tokens are exposed as shadcn HSL vars so Tailwind opacity
// modifiers (bg-accent/85, text-foreground/90, ...) keep working.
const SHADCN_TOKENS: Record<string, string> = {
  background: '--background',
  foreground: '--foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
};

function loadGoogleFonts(headingFont: string, bodyFont: string): void {
  const fonts: string[] = [];
  if (headingFont && !['Georgia', 'Inter', 'Montserrat', 'Poppins', 'Lato', 'Open Sans', 'Merriweather'].includes(headingFont)) {
    fonts.push(headingFont);
  }
  if (bodyFont && !['Georgia', 'Inter', 'Montserrat', 'Poppins', 'Lato', 'Open Sans', 'Merriweather'].includes(bodyFont)) {
    fonts.push(bodyFont);
  }
  if (fonts.length === 0) return;
  const existing = document.getElementById('theme-fonts') as HTMLLinkElement | null;
  const family = fonts.map((f) => f.replace(/ /g, '+')).join('&family=');
  if (existing) {
    existing.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
  } else {
    const link = document.createElement('link');
    link.id = 'theme-fonts';
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
    document.head.appendChild(link);
  }
}

function applyTypography(root: HTMLElement, typography: ThemeSettings['typography']): void {
  if (!typography) return;
  root.style.setProperty('--font-heading', fontStack(typography.headingFont));
  root.style.setProperty('--font-body', fontStack(typography.bodyFont));

  const sizes = (set: { desktop: number; tablet: number; mobile: number } | undefined, prefix: string) => {
    if (!set) return;
    root.style.setProperty(`${prefix}`, `${set.desktop}px`);
    root.style.setProperty(`${prefix}-tablet`, `${set.tablet}px`);
    root.style.setProperty(`${prefix}-mobile`, `${set.mobile}px`);
  };

  sizes(typography.baseSize, '--base-font-size');
  const headingSizes = typography.headingSizes || {};
  sizes(headingSizes.h1, '--h1');
  sizes(headingSizes.h2, '--h2');
  sizes(headingSizes.h3, '--h3');
  sizes(headingSizes.h4, '--h4');
  sizes(headingSizes.h5, '--h5');
  sizes(headingSizes.small, '--small');
  sizes(headingSizes.eyebrow, '--eyebrow');

  root.style.setProperty('--heading-weight', String(typography.headingWeight ?? 500));
  root.style.setProperty('--body-weight', String(typography.bodyWeight ?? 400));
  root.style.setProperty('--heading-transform', typography.headingTransform || 'none');
  root.style.setProperty('--heading-line-height', String(typography.headingLineHeight ?? 1.15));
  root.style.setProperty('--body-line-height', String(typography.bodyLineHeight ?? 1.6));
  root.style.setProperty('--heading-letter-spacing', typography.headingLetterSpacing || '0em');
  root.style.setProperty('--eyebrow-transform', typography.eyebrowTransform || 'uppercase');
  root.style.setProperty('--eyebrow-letter-spacing', typography.eyebrowLetterSpacing || '0.35em');

  loadGoogleFonts(typography.headingFont, typography.bodyFont);
}

function applyButtons(root: HTMLElement, buttons: ThemeSettings['buttons']): void {
  if (!buttons) return;
  root.style.setProperty('--btn-radius', buttons.borderRadius);
  root.style.setProperty('--btn-px', buttons.paddingX);
  root.style.setProperty('--btn-py', buttons.paddingY);
  root.style.setProperty('--btn-font-size', buttons.fontSize);
  root.style.setProperty('--btn-font-weight', String(buttons.fontWeight));
  root.style.setProperty('--btn-transform', buttons.textTransform);
  root.style.setProperty('--btn-tracking', buttons.letterSpacing);
  root.style.setProperty('--btn-primary-bg', buttons.primaryBg);
  root.style.setProperty('--btn-primary-text', buttons.primaryText);
  root.style.setProperty('--btn-primary-hover-bg', buttons.primaryHoverBg);
  root.style.setProperty('--btn-gold-bg', buttons.goldBg);
  root.style.setProperty('--btn-gold-text', buttons.goldText);
  root.style.setProperty('--btn-gold-hover-bg', buttons.goldHoverBg);
  root.style.setProperty('--btn-outline-text', buttons.outlineText);
  root.style.setProperty('--btn-outline-border', buttons.outlineBorder);
  root.style.setProperty('--btn-outline-hover-bg', buttons.outlineHoverBg);
  root.style.setProperty('--btn-outline-hover-text', buttons.outlineHoverText);
  root.style.setProperty('--btn-ghost-text', buttons.ghostText);
  root.style.setProperty('--btn-white-bg', buttons.whiteBg);
  root.style.setProperty('--btn-white-text', buttons.whiteText);
  root.style.setProperty('--btn-white-hover-bg', buttons.whiteHoverBg);
}

function applyEffects(root: HTMLElement, effects: ThemeSettings['effects']): void {
  if (!effects) return;
  root.style.setProperty('--radius-sm', effects.radiusSm);
  root.style.setProperty('--radius-md', effects.radiusMd);
  root.style.setProperty('--radius-lg', effects.radiusLg);
  root.style.setProperty('--radius', effects.radiusMd || '0.25rem');
  root.style.setProperty('--shadow-sm', effects.shadowSm);
  root.style.setProperty('--shadow-md', effects.shadowMd);
  root.style.setProperty('--shadow-lg', effects.shadowLg);
  root.style.setProperty('--transition', effects.transition);
  root.style.setProperty('--marquee-duration', effects.marqueeDuration);
}

export function getCssVar(name: string, fallback = ''): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function applyTheme(theme: ThemeSettings | null): void {
  const root = document.documentElement;
  const colors = theme?.colors || {};

  // Base palette → shadcn HSL vars
  for (const [token, cssVar] of Object.entries(SHADCN_TOKENS)) {
    const value = colors[token];
    if (!value) continue;
    const triplet = hexToHslTriplet(value);
    root.style.setProperty(cssVar, triplet || value);
  }

  // Remaining color tokens → plain vars (--<kebab-token>)
  for (const [token, value] of Object.entries(colors)) {
    if (SHADCN_TOKENS[token]) continue;
    root.style.setProperty(`--${camelToKebab(token)}`, value);
  }

  // Derived glow overlays (track the hero glow color with fixed opacity)
  const glowColor = colors['heroGlowColor'] || '#C9A227';
  root.style.setProperty('--glow-hero', `color-mix(in srgb, ${glowColor} 8%, transparent)`);
  root.style.setProperty('--glow-newsletter', `color-mix(in srgb, ${glowColor} 12%, transparent)`);

  applyTypography(root, theme?.typography as ThemeSettings['typography']);
  applyButtons(root, theme?.buttons as ThemeSettings['buttons']);
  applyEffects(root, theme?.effects as ThemeSettings['effects']);

  if (theme?.header) {
    root.style.setProperty('--header-height', theme.header.height || '80px');
  }
  if (theme?.footer) {
    root.style.setProperty('--footer-padding-y', theme.footer.paddingY || '64px');
  }

  if (theme) {
    root.setAttribute('data-theme', theme.isDark ? 'dark' : 'light');
    const userPref = localStorage.getItem('bristi_theme');
    if (userPref !== 'light' && userPref !== 'dark') {
      if (theme.isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }
}
