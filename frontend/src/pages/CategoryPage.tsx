import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '@/services/catalog.service';
import { useProductListing } from '@/hooks/useProductListing';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductCard';
import { ErrorState } from '@/components/shared/ErrorState';
import { usePageMeta } from '@/lib/seo';
import { getImageUrl } from '@/lib/utils';
import { useBrandName } from '@/context/SettingsContext';

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const brandName = useBrandName();

  const { data: category, isLoading: categoryLoading, error: categoryError, refetch: refetchCategory } = useQuery({
    queryKey: ['categories', 'slug', slug],
    queryFn: () => catalogService.getCategoryBySlug(slug as string),
    enabled: Boolean(slug),
  });

  const { items, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, error, refetch } = useProductListing({
    categorySlugs: slug ? [slug] : [],
    sort: 'createdAt',
    order: 'desc',
    enabled: Boolean(slug),
  });

  const sentinelRef = useInfiniteScroll({
    hasMore: hasNextPage,
    isLoading: isFetchingNextPage,
    onLoadMore: () => fetchNextPage(),
  });

  usePageMeta({
    title: category ? `${brandName} | ${category.name}` : `${brandName} | ${slug}`,
    description: category?.subtitle ?? category?.seo?.description ?? category?.description,
    image: category ? getImageUrl(category.bannerImage ?? category.image) ?? undefined : undefined,
  });

  if (categoryLoading) {
    return (
      <section className="bg-background pb-24">
        <div className="container-lux pt-32">
          <ProductGridSkeleton count={8} columns={4} />
        </div>
      </section>
    );
  }

  if (categoryError || !category) {
    return (
      <ErrorState
        message={categoryError instanceof Error ? categoryError.message : 'Category not found'}
        onRetry={() => refetchCategory()}
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Category"
        title={category.name}
        description={category.subtitle ?? category.description}
        image={getImageUrl(category.bannerImage ?? category.image) ?? undefined}
        breadcrumb={[{ label: 'Shop', to: '/shop' }, { label: category.name }]}
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
              <p className="mt-3 text-sm text-muted-foreground">Pieces in this category are being curated — check back soon.</p>
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
