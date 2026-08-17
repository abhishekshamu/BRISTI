import { useState, type CSSProperties } from 'react';
import { cn, getImageUrl } from '@/lib/utils';
import { useBrandIdentity, useSiteSettings } from '@/context/SettingsContext';
import { getBrandFontStack, normalizeBrandNameTypography, responsiveBrandFontSize } from '@shared/utils';

type BrandIdentityVariant = 'header' | 'footer' | 'mobile';

interface BrandIdentityProps {
  variant?: BrandIdentityVariant;
  className?: string;
  wordmarkClassName?: string;
  imageClassName?: string;
  iconClassName?: string;
  taglineClassName?: string;
  showTagline?: boolean;
}

const DEFAULT_CLASSES: Record<BrandIdentityVariant, {
  wordmark: string;
  image: string;
  icon: string;
  tagline: string;
}> = {
  header: {
    wordmark:
      'truncate font-display text-xl font-semibold tracking-[0.22em] text-[var(--header-text)] sm:text-2xl sm:tracking-[0.3em]',
    image: 'h-8 w-auto object-contain',
    icon: 'h-8 w-auto object-contain',
    tagline: 'mt-1 hidden text-[9px] uppercase tracking-lux text-muted-foreground sm:block',
  },
  footer: {
    wordmark:
      'font-display text-3xl font-semibold tracking-[0.3em] text-[var(--footer-heading)]',
    image: 'h-10 w-auto object-contain',
    icon: 'h-10 w-auto object-contain',
    tagline: 'mt-2 text-[10px] uppercase tracking-lux text-[var(--footer-text)]',
  },
  mobile: {
    wordmark:
      'font-display text-xl font-semibold tracking-[0.3em] text-[var(--mobile-drawer-text)]',
    image: 'h-8 w-auto object-contain',
    icon: 'h-8 w-auto object-contain',
    tagline: 'mt-1 text-[9px] uppercase tracking-lux text-[var(--mobile-drawer-text)]/70',
  },
};

/**
 * Centralized brand rendering — the single source of truth for the brand in
 * the header, mobile nav, footer and anywhere else the brand appears.
 *
 * Rendering rules (from the Brand Identity settings):
 * - Brand Name mode = text, icon present            → [icon] + text
 * - Brand Name mode = text, no icon                 → text
 * - Brand Name mode = image, icon present           → [icon] + wordmark image
 * - Brand Name mode = image, no icon                → wordmark image
 * - Wordmark image broken/unavailable               → text fallback
 * - Icon broken                                     → hidden, brand unaffected
 *
 * The wordmark image is never used as the icon and the icon is never rendered
 * instead of the brand name.
 */
export function BrandIdentity({
  variant = 'header',
  className,
  wordmarkClassName,
  imageClassName,
  iconClassName,
  taglineClassName,
  showTagline = false,
}: BrandIdentityProps) {
  const identity = useBrandIdentity();
  const { settings } = useSiteSettings();
  const defaults = DEFAULT_CLASSES[variant];

  const [wordmarkFailed, setWordmarkFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);

  const wordmarkImage = getImageUrl(identity.wordmark.imageUrl);
  const iconImage = getImageUrl(identity.icon.imageUrl);

  const showWordmarkImage = identity.wordmark.mode === 'image' && !!wordmarkImage && !wordmarkFailed;
  const showIcon = !!iconImage && !iconFailed;

  // Global Brand Name Typography — applied to the text wordmark ONLY. Image
  // mode never receives typography. Responsive px → clamp() keeps an oversized
  // desktop wordmark from breaking the mobile header.
  const typography = normalizeBrandNameTypography(settings?.brandNameTypography);
  const textStyle: CSSProperties = {
    fontFamily: getBrandFontStack(typography.fontFamily),
    fontWeight: typography.fontWeight,
    fontSize: responsiveBrandFontSize(typography.fontSize),
    letterSpacing: typography.letterSpacing,
    lineHeight: typography.lineHeight,
    fontStyle: typography.fontStyle,
    textTransform: typography.textTransform,
    textDecoration: typography.textDecoration === 'none' ? undefined : typography.textDecoration,
    textAlign: typography.textAlign,
    maxWidth: '100%',
  };
  // Align the icon+wordmark lockup as a group without touching the header
  // flex layout: left (default) is byte-for-byte the current behavior.
  const groupJustify: CSSProperties['justifyContent'] =
    typography.textAlign === 'center' ? 'center' : typography.textAlign === 'right' ? 'flex-end' : 'flex-start';

  return (
    <span className={cn('flex min-w-0 flex-col leading-none', className)} style={{ textAlign: typography.textAlign }}>
      <span className="flex min-w-0 items-center gap-2" style={{ justifyContent: groupJustify }}>
        {showIcon && (
          <img
            src={iconImage!}
            alt=""
            aria-hidden="true"
            className={cn(defaults.icon, iconClassName)}
            onError={() => setIconFailed(true)}
            loading="lazy"
            draggable={false}
          />
        )}
        {showWordmarkImage ? (
          <img
            src={wordmarkImage!}
            alt={identity.wordmark.text || 'Brand'}
            title={identity.wordmark.text}
            className={cn(defaults.image, imageClassName)}
            onError={() => setWordmarkFailed(true)}
            loading="lazy"
            draggable={false}
          />
        ) : (
          <span className={cn(defaults.wordmark, wordmarkClassName)} style={textStyle}>
            {identity.wordmark.text}
          </span>
        )}
      </span>
      {showTagline && settings?.slogan && (
        <span className={cn(defaults.tagline, taglineClassName)}>{settings.slogan}</span>
      )}
    </span>
  );
}
