import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '@/services/catalog.service';
import { useProductListing } from '@/hooks/useProductListing';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductCard';
import { ErrorState } from '@/components/shared/ErrorState';
import { usePageMeta } from '@/lib/seo';
import { getImageUrl } from '@/lib/utils';

export default function CollectionDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();

  const { data: collection, isLoading: collectionLoading, error: collectionError } = useQuery({
    queryKey: ['collections', 'slug', slug],
    queryFn: () => catalogService.getCollectionBySlug(slug),
    enabled: Boolean(slug),
  });

  const collectionId = collection ? String(collection._id) : undefined;
  const { items, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } = useProductListing({
    collectionId,
    enabled: Boolean(collectionId),
  });

  usePageMeta({
    title: collection ? `${collection.name} — BRISTI` : 'Collection — BRISTI',
    description: collection?.seo?.description ?? collection?.description,
    image: collection?.image,
  });

  const sentinelRef = useInfiniteScroll({
    hasMore: hasNextPage,
    isLoading: isFetchingNextPage,
    onLoadMore: () => fetchNextPage(),
  });

  const bannerImage = getImageUrl(collection?.bannerImage ?? collection?.image);

  if (collectionError) {
    return <ErrorState message={(collectionError as Error)?.message ?? 'Collection not found'} />;
  }

  return (
    <>
      <section className="relative flex min-h-[420px] items-end overflow-hidden bg-[#0a0a0a] pb-14 pt-36">
        {bannerImage && <img src={bannerImage} alt={collection?.name} className="absolute inset-0 h-full w-full object-cover opacity-50" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
        <div className="container-lux relative">
          {collectionLoading ? (
            <div className="h-16 w-2/3 animate-pulse bg-white/20" />
          ) : (
            <div className="flex flex-col gap-4">
              <span className="text-[11px] font-medium uppercase tracking-lux-sm text-accent">The Collection</span>
              <h1 className="font-display text-5xl font-medium text-white sm:text-6xl">{collection?.name}</h1>
              <p className="max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                {collection?.description ?? collection?.shortDescription}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="bg-background py-16">
        <div className="container-lux">
          {isLoading ? (
            <ProductGridSkeleton count={8} />
          ) : error ? (
            <ErrorState message={(error as Error)?.message ?? 'Failed to load pieces'} onRetry={() => refetch()} />
          ) : items.length === 0 ? (
            <p className="py-20 text-center text-sm text-muted-foreground">
              Pieces from this collection are being prepared. Please check back soon.
            </p>
          ) : (
            <>
              <p className="mb-10 border-y border-border py-4 text-xs uppercase tracking-lux-sm text-muted-foreground">
                {items.length} piece{items.length === 1 ? '' : 's'}
              </p>
              <ProductGrid products={items} columns={3} />
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
