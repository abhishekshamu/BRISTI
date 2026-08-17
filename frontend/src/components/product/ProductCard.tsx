import { memo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { RatingStars } from '@/components/shared/RatingStars';
import { SafeImage } from '@/components/shared/SafeImage';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useBrandName } from '@/context/SettingsContext';
import { useCurrency } from '@/context/CurrencyContext';
import { getDefaultVariant } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Product } from '@shared/types';

export const ProductCard = memo(function ProductCard({ product, className, eager = false }: { product: Product; className?: string; eager?: boolean }) {
  const brandName = useBrandName();
  const { formatPrice } = useCurrency();
  const { isInWishlist, toggle } = useWishlist();
  const { addItem } = useCart();
  const { isAuthenticated } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  const images = product.images?.filter((image) => image.url) ?? [];
  const featuredImage = images.find((image) => image.isFeatured) ?? images[0];
  const hoverImage = images.length > 1 ? images[1] : undefined;
  const productId = String(product._id);
  const inWishlist = isInWishlist(productId);
  const isSale = product.isOnSale === true;
  const isSoldOut = product.stock <= 0 && !product.allowBackorder;
  const price = product.price;

  const effectiveImage = isHovered && hoverImage ? hoverImage : featuredImage;

  const handleAddToCart = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (isSoldOut) return;
    const variant = getDefaultVariant(product);
    try {
      await addItem({
        productId,
        quantity: 1,
        variantId: variant?.id,
        selectedOptions: variant?.options ?? undefined,
      });
      toast.success('Added to bag', { description: product.name });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not add to bag');
    }
  };

  const handleWishlist = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isAuthenticated) {
      toast.info('Create an account to save your wishlist');
    }
    await toggle(productId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn('group relative', className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
          {effectiveImage?.url ? (
            <SafeImage
              src={effectiveImage.url}
              alt={effectiveImage.alt ?? product.name}
              loading={eager ? 'eager' : 'lazy'}
              className={cn(
                'h-full w-full object-cover transition-all duration-700 ease-out',
                hoverImage ? (isHovered ? 'scale-105' : 'scale-100') : 'group-hover:scale-105',
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground">
              <span className="font-display text-lg tracking-wide">BRISTI</span>
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {isSale && <Badge variant="sale">Sale</Badge>}
            {product.featured && !isSale && <Badge variant="gold">New</Badge>}
            {isSoldOut && <Badge variant="muted">Sold out</Badge>}
          </div>

          <button
            type="button"
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            onClick={handleWishlist}
            className={cn(
              'absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--ice)]/90 shadow-sm backdrop-blur transition-all hover:scale-110',
              inWishlist ? 'text-red-500' : 'text-foreground/70 hover:text-foreground',
            )}
          >
            <Heart className={cn('h-4 w-4', inWishlist && 'fill-current')} />
          </button>

          <div className="absolute inset-x-0 bottom-0 translate-y-full p-3 transition-transform duration-500 ease-out group-hover:translate-y-0">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isSoldOut}
              className="flex w-full items-center justify-center gap-2 bg-foreground/95 py-3 text-[11px] font-medium uppercase tracking-lux-sm text-background backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingBag className="h-4 w-4" />
              {isSoldOut ? 'Sold out' : 'Add to bag'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 pt-4">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <h3 className="min-w-0 flex-1 text-sm font-medium tracking-wide text-foreground">{product.name}</h3>
            <div className="flex shrink-0 items-baseline gap-2 whitespace-nowrap">
              <span className="text-sm font-medium text-foreground">{formatPrice(price)}</span>
              {isSale && product.compareAtPrice && product.compareAtPrice > price && (
                <span className="text-xs text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{product.brand || brandName}</span>
            {product.rating?.count > 0 && <RatingStars rating={product.rating.average} size={12} />}
          </div>
        </div>
      </Link>
    </motion.div>
  );
});

export function ProductGridSkeleton({ count = 8, className, columns }: { count?: number; className?: string; columns?: 3 | 4 }) {
  const gridClasses =
    columns === 4
      ? 'grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-x-8 lg:grid-cols-4'
      : columns === 3
        ? 'grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-x-8 lg:grid-cols-3'
        : 'grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-x-8 lg:grid-cols-3 xl:grid-cols-4';
  return (
    <div className={cn(gridClasses, className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex flex-col">
          <div className="aspect-[3/4] animate-pulse bg-secondary" />
          <div className="mt-4 h-4 w-3/4 animate-pulse bg-secondary" />
          <div className="mt-2 h-3 w-1/3 animate-pulse bg-secondary" />
        </div>
      ))}
    </div>
  );
}
