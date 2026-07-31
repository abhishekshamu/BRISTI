import { useQuery } from '@tanstack/react-query';
import { Tag } from 'lucide-react';
import { productService } from '@/services/product.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductGridSkeleton } from '@/components/product/ProductCard';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePageMeta } from '@/lib/seo';

export default function SalePage() {
  usePageMeta({ title: 'Sale — BRISTI', description: 'Selected pieces from the maison, marked down for a limited season.' });

  const { data: products, isLoading, error, refetch } = useQuery({
    queryKey: ['products', 'sale', 'all'],
    queryFn: () => productService.onSale(48),
    staleTime: 1000 * 60 * 5,
  });

  return (
    <>
      <PageHeader
        eyebrow="Limited season"
        title="The Sale"
        description="A curated selection of pieces marked down for a limited time. When they're gone, they're gone."
        breadcrumb={[{ label: 'Sale' }]}
        dark
      />
      <section className="bg-background pb-24">
        <div className="container-lux">
          {isLoading ? (
            <ProductGridSkeleton count={8} />
          ) : error ? (
            <ErrorState message={(error as Error)?.message ?? 'Failed to load sale pieces'} onRetry={() => refetch()} />
          ) : (products?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<Tag className="h-7 w-7" />}
              title="Nothing on sale right now"
              description="The sale pieces have all found new homes. Follow the maison for the next edit."
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
