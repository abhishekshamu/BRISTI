import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import { useProductListing } from '@/hooks/useProductListing';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductCard';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePageMeta } from '@/lib/seo';
import { useBrandName } from '@/context/SettingsContext';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() ?? '';
  const brandName = useBrandName();

  usePageMeta({
    title: query ? `Search: ${query} — ${brandName}` : `Search — ${brandName}`,
    description: `Search results for "${query}" in the ${brandName} collection.`,
  });

  const { items, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } = useProductListing({
    search: query,
    enabled: query.length > 0,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '500px' },
    );
    const sentinel = document.getElementById('search-sentinel');
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const heading = useMemo(
    () => (query ? `Results for “${query}”` : 'Search the maison'),
    [query],
  );

  return (
    <>
      <PageHeader
        eyebrow="Search"
        title={heading}
        description={query ? undefined : 'Find a piece by name, material or mood.'}
        breadcrumb={[{ label: 'Search' }]}
      />

      <section className="bg-background pb-24">
        <div className="container-lux">
          {query.length === 0 ? (
            <EmptyState
              icon={<SearchIcon className="h-7 w-7" />}
              title="Type to explore"
              description="Use the search bar above or browse the full collection from the shop."
              action={{ label: 'Shop all pieces', to: '/shop' }}
            />
          ) : isLoading ? (
            <ProductGridSkeleton count={6} columns={4} />
          ) : error && items.length === 0 ? (
            <ErrorState message={(error as Error)?.message ?? 'Search failed'} onRetry={() => refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={<SearchIcon className="h-7 w-7" />}
              title="Nothing matched"
              description={`No pieces match “${query}”. Try a broader term like “dress” or “silk”.`}
              action={{ label: 'Shop all pieces', to: '/shop' }}
            />
          ) : (
            <>
              <p className="mb-10 border-y border-border py-4 text-xs uppercase tracking-lux-sm text-muted-foreground">
                {items.length} result{items.length === 1 ? '' : 's'} for “{query}”
              </p>
              <ProductGrid products={items} columns={4} />
              <div id="search-sentinel" className="h-px" aria-hidden="true" />
              {error ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Couldn't load more results. <button type="button" className="underline underline-offset-4" onClick={() => fetchNextPage()}>Try again</button>
                </p>
              ) : isFetchingNextPage ? (
                <p className="py-8 text-center text-xs uppercase tracking-lux-sm text-muted-foreground">Loading more…</p>
              ) : null}
            </>
          )}
        </div>
      </section>
    </>
  );
}
