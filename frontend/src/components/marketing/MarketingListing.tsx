import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useProductListing } from '@/hooks/useProductListing';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductCard';
import { ErrorState } from '@/components/shared/ErrorState';
import { usePageMeta } from '@/lib/seo';
import { useBrandName } from '@/context/SettingsContext';

export interface MarketingListingConfig {
  eyebrow: string;
  title: string;
  description: string;
  metaDescription: string;
  filter: {
    newArrival?: boolean;
    bestSeller?: boolean;
    trending?: boolean;
    sale?: boolean;
    featured?: boolean;
    recommended?: boolean;
    exclusive?: boolean;
    limitedEdition?: boolean;
    editorsPick?: boolean;
    premiumCollection?: boolean;
  };
}

export function MarketingListing({ config }: { config: MarketingListingConfig }) {
  const brandName = useBrandName();
  const { items, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } = useProductListing({
    sort: 'createdAt',
    order: 'desc',
    ...config.filter,
  });

  const sentinelRef = useInfiniteScroll({
    hasMore: hasNextPage,
    isLoading: isFetchingNextPage,
    onLoadMore: () => fetchNextPage(),
  });

  usePageMeta({
    title: `${config.title} — ${brandName}`,
    description: config.metaDescription,
  });

  return (
    <>
      <PageHeader
        eyebrow={config.eyebrow}
        title={config.title}
        description={config.description}
        breadcrumb={[{ label: config.title }]}
      />

      <section className="bg-background pb-24">
        <div className="container-lux">
          {isLoading ? (
            <ProductGridSkeleton count={8} columns={4} />
          ) : error ? (
            <ErrorState
              message={error instanceof Error ? error.message : 'Failed to load products'}
              onRetry={() => refetch()}
            />
          ) : items.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-display text-3xl font-medium">No products available</p>
              <p className="mt-3 text-sm text-muted-foreground">New pieces are being curated — check back soon.</p>
            </div>
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
      </section>
    </>
  );
}
