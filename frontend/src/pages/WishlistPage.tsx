import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { productService } from '@/services/product.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageMeta } from '@/lib/seo';
import { formatPrice, getImageUrl, getDefaultVariant } from '@/lib/utils';
import type { Product } from '@shared/types';

export default function WishlistPage() {
  const { productIds, remove } = useWishlist();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();

  usePageMeta({ title: 'Wishlist — BRISTI' });

  const { data: products, isLoading } = useQuery({
    queryKey: ['wishlist', 'products', productIds.join(',')],
    queryFn: async () => {
      const results = await Promise.allSettled(productIds.map((id) => productService.getById(id)));
      return results
        .filter((result): result is PromiseFulfilledResult<Product> => result.status === 'fulfilled')
        .map((result) => result.value);
    },
    enabled: productIds.length > 0,
    staleTime: 1000 * 30,
  });

  const grouped = useMemo(() => {
    const productsById = new Map((products ?? []).map((product) => [String(product._id), product]));
    return productIds
      .map((id) => productsById.get(id))
      .filter((product): product is Product => Boolean(product));
  }, [products, productIds]);

  const handleMoveToBag = async (product: Product) => {
    const variant = getDefaultVariant(product);
    try {
      await addItem({
        productId: String(product._id),
        quantity: 1,
        variantId: variant?.id,
        selectedOptions: variant?.options ?? undefined,
      });
      toast.success('Added to bag', { description: product.name });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add to bag');
    }
  };

  return (
    <>
      <PageHeader title="Your Wishlist" description={productIds.length > 0 ? `${productIds.length} piece${productIds.length === 1 ? '' : 's'} saved for later` : undefined} breadcrumb={[{ label: 'Wishlist' }]} />

      <section className="bg-background pb-24">
        <div className="container-lux">
          {!isAuthenticated ? (
            <EmptyState
              icon={<Heart className="h-7 w-7" />}
              title="Saved for later — locally"
              description="Sign in to keep your wishlist synced across every device, forever."
              action={{ label: 'Sign in', to: '/login' }}
            />
          ) : isLoading ? (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-[3/4] w-full" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <EmptyState
              icon={<Heart className="h-7 w-7" />}
              title="Nothing saved yet"
              description="Tap the heart on any piece to keep it here — your personal edit of the collection."
              action={{ label: 'Discover pieces', to: '/shop' }}
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 lg:grid-cols-4">
              {grouped.map((product) => {
                const image = getImageUrl(product.images?.find((image) => image.isFeatured)?.url ?? product.images?.[0]?.url);
                const isSale = Boolean(product.compareAtPrice && product.compareAtPrice > product.price);
                return (
                  <div key={String(product._id)} className="group flex flex-col">
                    <a href={`/product/${product.slug}`} className="relative block aspect-[3/4] overflow-hidden bg-secondary">
                      {image ? (
                        <img src={image} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <span className="font-display text-lg tracking-[0.3em] text-muted-foreground">BRISTI</span>
                        </div>
                      )}
                      <button
                        type="button"
                        aria-label="Remove from wishlist"
                        onClick={() => remove(String(product._id))}
                        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ice)]/90 text-[hsl(var(--destructive))] shadow-sm transition-transform hover:scale-110"
                      >
                        <Heart className="h-4 w-4 fill-current" />
                      </button>
                    </a>
                    <div className="flex flex-col gap-2 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-medium">{product.name}</h3>
                        <span className="whitespace-nowrap text-sm font-medium">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                      {isSale && (
                        <span className="text-xs text-muted-foreground line-through">{formatPrice(product.compareAtPrice!)}</span>
                      )}
                      <Button variant="outline" size="sm" className="mt-1 w-full" onClick={() => handleMoveToBag(product)}>
                        <ShoppingBag className="h-3.5 w-3.5" /> Move to bag
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
