import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layers } from 'lucide-react';
import { catalogService } from '@/services/catalog.service';
import { useProductListing } from '@/hooks/useProductListing';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductCard';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { PromotionBanner, useActivePromotionBanner } from '@/components/promotion/PromotionBanner';
import { usePageMeta } from '@/lib/seo';
import { getImageUrl } from '@/lib/utils';
import { useBrandName } from '@/context/SettingsContext';

/**
 * Dynamic collection page — driven entirely by the CMS. Works for ANY
 * collection slug (oversized-tshirts, summer-edit, ...). Products are
 * matched through the `collections` array on the Product document, so
 * assignments made in Admin appear instantly.
 */
export default function CollectionDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const brandName = useBrandName();

  const { data: collection, isLoading: collectionLoading, error: collectionError } = useQuery({
    queryKey: ['collections', 'slug', slug],
    queryFn: () => catalogService.getCollectionBySlug(slug),
    enabled: Boolean(slug),
  });

  const isDisabled = collection && collection.isActive === false;

  const { items, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } = useProductListing({
    collectionSlugs: slug ? [slug] : undefined,
    enabled: Boolean(slug) && !isDisabled,
  });

  const promoBanner = useActivePromotionBanner(collection?.slug);

  const bannerDesktop = getImageUrl(collection?.bannerImage);
  const bannerTablet = getImageUrl(collection?.bannerTablet) ?? bannerDesktop;
  const bannerMobile = getImageUrl(collection?.mobileBanner) ?? bannerDesktop;

  usePageMeta({
    title: collection ? `${collection.seo?.title ?? collection.name} — ${brandName}` : `Collection — ${brandName}`,
    description: collection?.seo?.description ?? collection?.description ?? collection?.shortDescription,
    image: bannerDesktop ?? getImageUrl(collection?.image) ?? undefined,
  });

  const sentinelRef = useInfiniteScroll({
    hasMore: hasNextPage,
    isLoading: isFetchingNextPage,
    onLoadMore: () => fetchNextPage(),
  });

  if (collectionError) {
    return <ErrorState message={(collectionError as Error)?.message ?? 'Collection not found'} />;
  }

  if (isDisabled) {
    return (
      <ErrorState
        message="This collection is currently unavailable."
        onRetry={undefined}
      />
    );
  }

  return (
    <>
      <section className="border-b border-border bg-background pt-[90px] lg:pt-[106px]">
        <div className="container-lux py-5 sm:py-6">
          <div className="flex flex-col gap-3">
            <Breadcrumb
              items={[
                { label: 'Home', to: '/' },
                { label: 'Collections', to: '/collections' },
                { label: collection?.name ?? 'Collection' },
              ]}
            />
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 className="font-display text-2xl font-medium tracking-wide sm:text-3xl">
                {collectionLoading ? 'Loading…' : collection?.name ?? 'Collection'}
              </h1>
              {!isLoading && (
                <p className="text-xs uppercase tracking-lux-sm text-muted-foreground">
                  {collection?.productCount ?? items.length} piece{collection?.productCount === 1 || (collection?.productCount == null && items.length === 1) ? '' : 's'}
                </p>
              )}
            </div>
            {(collection?.description ?? collection?.shortDescription) && (
              <p className="line-clamp-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                {collection?.description ?? collection?.shortDescription}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Collection banner — desktop / tablet / mobile images supported independently */}
      {(bannerDesktop || bannerTablet || bannerMobile) && (
        <section className="bg-background">
          <div className="container-lux">
            <div className="relative overflow-hidden">
              {bannerDesktop && <img src={bannerDesktop} alt={collection?.name} className="hidden aspect-[21/9] w-full object-cover lg:block" />}
              {bannerTablet && <img src={bannerTablet} alt={collection?.name} className="hidden aspect-[16/7] w-full object-cover md:block lg:hidden" />}
              {bannerMobile && <img src={bannerMobile} alt={collection?.name} className="aspect-[4/3] w-full object-cover md:hidden" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
          </div>
        </section>
      )}

      {promoBanner && <PromotionBanner banner={promoBanner} />}

      <section className="bg-background pb-24">
        <div className="container-lux">
          <div className="mt-8">
            {isLoading ? (
              <ProductGridSkeleton count={8} columns={4} />
            ) : error ? (
              <ErrorState message={(error as Error)?.message ?? 'Failed to load pieces'} onRetry={() => refetch()} />
            ) : items.length === 0 ? (
              <EmptyState
                icon={<Layers className="h-7 w-7" />}
                title="Nothing here yet"
                description="Pieces are being prepared for this collection. Assign products to this collection from the CMS and they will appear here instantly."
                action={{ label: 'Shop everything', to: '/shop' }}
              />
            ) : (
              <>
                <ProductGrid products={items} columns={4} />
                <div ref={sentinelRef} className="h-px" aria-hidden="true" />
                {isFetchingNextPage && (
                  <p className="py-8 text-center text-xs uppercase tracking-lux-sm text-muted-foreground">Loading more…</p>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
