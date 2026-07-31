import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { productService } from '@/services/product.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductCard';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePageMeta } from '@/lib/seo';

export default function NewArrivalsPage() {
  usePageMeta({ title: 'New Arrivals — BRISTI', description: 'The first looks of the season, freshly released from the BRISTI atelier.' });

  const { data: products, isLoading, error, refetch } = useQuery({
    queryKey: ['products', 'new-arrivals', 'all'],
    queryFn: () => productService.newArrivals(48),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <>
      <PageHeader
        eyebrow="Just landed"
        title="New Arrivals"
        description="Fresh from the atelier — the first looks of the season, presented in the order they were released."
        breadcrumb={[{ label: 'New Arrivals' }]}
      />
      <section className="bg-background pb-24">
        <div className="container-lux">
          {isLoading ? (
            <ProductGridSkeleton count={8} />
          ) : error ? (
            <ErrorState message={(error as Error)?.message ?? 'Failed to load new arrivals'} onRetry={() => refetch()} />
          ) : (products?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-7 w-7" />}
              title="Nothing new yet"
              description="New pieces are on the way from the atelier. Check back soon for the first look."
              action={{ label: 'Shop the full collection', to: '/shop' }}
            />
          ) : (
            <ProductGrid products={products ?? []} columns={3} />
          )}
        </div>
      </section>
    </>
  );
}
