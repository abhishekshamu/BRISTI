import { useQuery } from '@tanstack/react-query';
import { promotionBannerService } from '@/services/promotion-banner.service';
import { getImageUrl } from '@/lib/utils';
import type { PromotionBanner as PromotionBannerType } from '@shared/types';

export function useActivePromotionBanner(pageSlug?: string): PromotionBannerType | undefined {
  const { data } = useQuery({
    queryKey: ['promotion-banners', 'active'],
    queryFn: promotionBannerService.getActive,
    staleTime: 1000 * 60 * 5,
  });

  return (data ?? []).find((banner) => {
    if (banner.scope === 'all') return true;
    return Boolean(pageSlug) && banner.categorySlugs.includes(pageSlug as string);
  });
}

export function PromotionBanner({ banner }: { banner: PromotionBannerType }) {
  const pad = Math.max(0, Number(banner.padding) || 0);

  const content = (
    <div
      className="relative h-[88px] overflow-hidden sm:h-[132px] lg:h-[168px]"
      style={{
        backgroundColor: banner.backgroundColor || undefined,
        borderColor: banner.borderColor || undefined,
        borderWidth: Number(banner.borderWidth) || 0,
        borderRadius: Number(banner.borderRadius) || 16,
        boxShadow: '0 12px 32px -16px rgba(0, 0, 0, 0.35)',
      }}
    >
      <picture className="absolute block" style={{ inset: pad }}>
        {banner.desktopImage && <source media="(min-width: 1024px)" srcSet={getImageUrl(banner.desktopImage) ?? undefined} />}
        {banner.tabletImage && <source media="(min-width: 640px)" srcSet={getImageUrl(banner.tabletImage) ?? undefined} />}
        <img
          src={getImageUrl(banner.mobileImage ?? banner.desktopImage ?? '') ?? undefined}
          alt={banner.name}
          className="h-full w-full object-cover"
        />
      </picture>
      {banner.overlayColor && (
        <div
          className="pointer-events-none absolute"
          style={{
            inset: pad,
            backgroundColor: banner.overlayColor,
            opacity: Math.min(100, Math.max(0, Number(banner.overlayOpacity) || 0)) / 100,
          }}
        />
      )}
    </div>
  );

  const bannerNode = (
    <div
      className="container-lux"
      style={{
        marginTop: Number(banner.marginTop) || 0,
        marginBottom: Number(banner.marginBottom) || 0,
      }}
    >
      {banner.redirectUrl ? (
        <a
          href={banner.redirectUrl}
          target={banner.openInNewTab ? '_blank' : undefined}
          rel={banner.openInNewTab ? 'noopener noreferrer' : undefined}
          className="block"
          aria-label={banner.name}
        >
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );

  return bannerNode;
}
