import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Heart, Minus, Plus, Ruler, Rotate3d, ShieldCheck, ShoppingBag, Truck, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import { productService } from '@/services/product.service';
import { reviewService } from '@/services/review.service';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RatingStars } from '@/components/shared/RatingStars';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductViewer } from '@/components/three/ProductViewer';
import { ErrorState } from '@/components/shared/ErrorState';
import { usePageMeta } from '@/lib/seo';
import { formatPrice, getImageUrl } from '@/lib/utils';

export default function ProductDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isInWishlist, toggle } = useWishlist();
  const { isAuthenticated } = useAuth();

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [viewMode, setViewMode] = useState<'gallery' | '3d'>('gallery');

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', 'slug', slug],
    queryFn: () => productService.getBySlug(slug),
    enabled: Boolean(slug),
  });

  const { data: reviews } = useQuery({
    queryKey: ['reviews', 'product', product?._id],
    queryFn: () => productService.getReviews(String(product!._id), 20),
    enabled: Boolean(product),
    staleTime: 1000 * 60,
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ['products', 'related', product?._id],
    queryFn: () => productService.related(product!),
    enabled: Boolean(product),
    staleTime: 1000 * 60 * 5,
  });

  usePageMeta({
    title: product ? `${product.name} — BRISTI` : 'Product — BRISTI',
    description: product?.seo?.description ?? product?.shortDescription ?? product?.description,
    image: product?.images?.find((image) => image.isFeatured)?.url ?? product?.images?.[0]?.url,
    keywords: product?.seo?.keywords,
  });

  useEffect(() => {
    if (product) {
      const initial: Record<string, string> = {};
      for (const option of product.options ?? []) {
        if (option.values?.length) initial[option.name] = option.values[0];
      }
      setSelectedOptions(initial);
      setQuantity(1);
      setActiveImage(0);
      setViewMode(product.models?.length ? 'gallery' : 'gallery');
    }
  }, [product?._id]);

  const images = useMemo(() => product?.images?.filter((image) => image.url) ?? [], [product]);
  const has3D = Boolean(product?.models?.length);
  const selectedVariant = useMemo(() => {
    if (!product) return undefined;
    return product.variants?.find((variant) => {
      const variantOptions = variant.options ?? {};
      return Object.entries(selectedOptions).every(([key, value]) => variantOptions[key] === value);
    });
  }, [product, selectedOptions]);

  const unitPrice = product ? product.price + (selectedVariant?.priceAdjustment ?? 0) : 0;
  const inWishlist = product ? isInWishlist(String(product._id)) : false;
  const isSale = Boolean(product?.compareAtPrice && product.compareAtPrice > unitPrice);
  const isSoldOut = Boolean(selectedVariant ? (selectedVariant.stock ?? 0) <= 0 : product && product.stock <= 0 && !product.allowBackorder);

  if (error) {
    return (
      <div className="container-lux py-40">
        <ErrorState message={(error as Error)?.message ?? 'Product not found'} onRetry={() => navigate('/shop')} />
      </div>
    );
  }

  if (isLoading || !product) {
    return (
      <div className="container-lux py-36">
        <div className="grid gap-12 lg:grid-cols-2">
          <Skeleton className="aspect-[3/4] w-full" />
          <div className="flex flex-col gap-6 py-6">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const handleAddToBag = async () => {
    try {
      await addItem({
        productId: String(product._id),
        variantId: selectedVariant?.id,
        quantity,
        selectedOptions,
      });
      toast.success('Added to bag', { description: `${product.name} · Qty ${quantity}` });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add to bag');
    }
  };

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      toast.info('Sign in to keep a lasting wishlist');
    }
    await toggle(String(product._id));
  };

  const currentImage = images[activeImage];

  return (
    <>
      <section className="bg-background pb-20 pt-28 lg:pt-36">
        <div className="container-lux">
          <Breadcrumb
            className="mb-8"
            items={[
              { label: 'Shop', to: '/shop' },
              ...(product.categoryPath?.slice(0, 1).map((category) => ({ label: category, to: `/shop?category=${category}` })) ?? []),
              { label: product.name },
            ]}
          />

          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
                {viewMode === '3d' ? (
                  <ProductViewer product={product} className="h-full w-full" />
                ) : currentImage ? (
                  <>
                    <img
                      src={getImageUrl(currentImage.url) ?? undefined}
                      alt={currentImage.alt ?? product.name}
                      className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]"
                    />
                    <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-foreground/70 shadow-sm">
                      <ZoomIn className="h-4 w-4" />
                    </span>
                  </>
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-secondary">
                    <span className="font-display text-2xl tracking-[0.3em] text-muted-foreground">BRISTI</span>
                  </div>
                )}

                <div className="absolute left-4 top-4 flex flex-col gap-2">
                  {isSale && <Badge variant="sale">Sale</Badge>}
                  {product.featured && !isSale && <Badge variant="gold">New</Badge>}
                  {isSoldOut && <Badge variant="muted">Sold out</Badge>}
                </div>

                {has3D && (
                  <button
                    type="button"
                    onClick={() => setViewMode((mode) => (mode === '3d' ? 'gallery' : '3d'))}
                    className="absolute bottom-4 left-4 flex items-center gap-2 bg-foreground/90 px-4 py-2.5 text-[10px] font-medium uppercase tracking-lux-sm text-background backdrop-blur transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <Rotate3d className="h-4 w-4" />
                    {viewMode === '3d' ? 'Back to photos' : 'View in 3D'}
                  </button>
                )}
              </div>

              {images.length > 1 && (
                <div className="mt-4 grid grid-cols-5 gap-3">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        setActiveImage(index);
                        setViewMode('gallery');
                      }}
                      className={`aspect-[3/4] overflow-hidden bg-secondary transition-all ${index === activeImage && viewMode === 'gallery' ? 'ring-1 ring-accent' : 'opacity-70 hover:opacity-100'}`}
                    >
                      <img src={getImageUrl(image.url) ?? undefined} alt={image.alt ?? product.name} loading="lazy" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-7 lg:py-2">
              <div className="flex flex-col gap-3">
                <p className="text-[11px] font-medium uppercase tracking-lux-sm text-muted-foreground">{product.brand || 'BRISTI'}</p>
                <h1 className="font-display text-3xl font-medium leading-tight sm:text-4xl lg:text-5xl">{product.name}</h1>
                <div className="flex items-center gap-4">
                  <RatingStars rating={product.rating?.average} count={product.rating?.count} />
                  <span className="text-xs uppercase tracking-lux-sm text-muted-foreground">{product.sku}</span>
                </div>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-2xl font-medium">{formatPrice(unitPrice)}</span>
                  {product.compareAtPrice && product.compareAtPrice > unitPrice && (
                    <>
                      <span className="text-base text-muted-foreground line-through">{formatPrice(product.compareAtPrice)}</span>
                      <Badge variant="sale">
                        Save {formatPrice(product.compareAtPrice - unitPrice)}
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              <p className="text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
                {product.shortDescription || product.description}
              </p>

              {product.options && product.options.length > 0 && (
                <div className="flex flex-col gap-6">
                  {product.options.map((option) => (
                    <div key={option.name}>
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-xs font-medium uppercase tracking-lux-sm">{option.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedOptions[option.name]}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setSelectedOptions((prev) => ({ ...prev, [option.name]: value }))}
                            className={`min-w-12 border px-4 py-2.5 text-xs uppercase tracking-[0.12em] transition-all ${
                              selectedOptions[option.name] === value
                                ? 'border-foreground bg-foreground text-background'
                                : 'border-input hover:border-foreground'
                            }`}
                          >
                            {value}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-stretch gap-4">
                <div className="flex items-center border border-border">
                  <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-12 w-12 items-center justify-center transition-colors hover:bg-secondary">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="flex h-12 w-12 items-center justify-center text-sm font-medium">{quantity}</span>
                  <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((q) => q + 1)} className="flex h-12 w-12 items-center justify-center transition-colors hover:bg-secondary">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <Button variant="gold" size="lg" className="flex-1" onClick={handleAddToBag} disabled={isSoldOut}>
                  <ShoppingBag className="h-4 w-4" />
                  {isSoldOut ? 'Sold out' : 'Add to bag'}
                </Button>
                <Button variant="outline" size="icon" aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'} onClick={handleWishlist} className="h-14 w-14">
                  <Heart className={`h-5 w-5 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
              </div>

              <div className="flex flex-col gap-3 border-y border-border py-5 text-xs text-muted-foreground">
                <p className="flex items-center gap-3">
                  <Truck className="h-4 w-4 text-accent" /> Complimentary shipping on orders over $100 — delivered in 2–4 business days
                </p>
                <p className="flex items-center gap-3">
                  <Ruler className="h-4 w-4 text-accent" /> Size guides available on every product page
                </p>
                <p className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-accent" /> Secure payment — Stripe & Razorpay encrypted checkout
                </p>
              </div>

              <Accordion type="single" collapsible>
                <AccordionItem value="details">
                  <AccordionTrigger>Details</AccordionTrigger>
                  <AccordionContent className="prose-lux">{product.description}</AccordionContent>
                </AccordionItem>
                <AccordionItem value="shipping">
                  <AccordionTrigger>Shipping & Delivery</AccordionTrigger>
                  <AccordionContent>
                    Complimentary standard shipping on orders over $100. Express delivery available at checkout. All orders are shipped in BRISTI signature packaging within 24 hours.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="returns">
                  <AccordionTrigger>Returns & Exchanges</AccordionTrigger>
                  <AccordionContent>
                    We accept returns within 30 days of delivery. Items must be unworn, unwashed and with original tags attached. Refunds are issued to the original payment method within 5–7 business days.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background pb-24">
        <div className="container-lux">
          <Tabs defaultValue="reviews">
            <TabsList className="w-full">
              <TabsTrigger value="reviews" className="flex-1">
                Reviews ({reviews?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="related" className="flex-1">
                You may also like
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reviews">
              <ReviewsSection productId={String(product._id)} reviews={reviews ?? []} />
            </TabsContent>

            <TabsContent value="related">
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 sm:gap-x-8 lg:grid-cols-4">
                {(relatedProducts ?? []).map((related) => (
                  <ProductCard key={String(related._id)} product={related} />
                ))}
                {(relatedProducts ?? []).length === 0 && (
                  <p className="col-span-full py-12 text-center text-sm text-muted-foreground">More pieces from this world are on their way.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </>
  );
}

function ReviewsSection({ productId, reviews }: { productId: string; reviews: import('@shared/types').Review[] }) {
  const { isAuthenticated } = useAuth();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const average = reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((review) => review.rating === star).length,
  }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (comment.trim().length < 3) {
      toast.error('Please write a short review');
      return;
    }
    setSubmitting(true);
    try {
      await reviewService.create({ productId, rating, title: title || undefined, comment });
      toast.success('Review submitted', { description: 'It will appear once approved by our atelier.' });
      setTitle('');
      setComment('');
      setRating(5);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <div>
        <div className="flex items-end gap-6 border-b border-border pb-8">
          <p className="font-display text-7xl font-medium">{average > 0 ? average.toFixed(1) : '—'}</p>
          <div className="flex flex-col gap-2 pb-2">
            <RatingStars rating={average} size={16} />
            <p className="text-xs text-muted-foreground">{reviews.length} verified review{reviews.length === 1 ? '' : 's'}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 py-8">
          {distribution.map(({ star, count }) => {
            const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="w-3">{star}★</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-accent" style={{ width: `${percentage}%` }} />
                </div>
                <span className="w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>

        <ul className="flex flex-col divide-y divide-border">
          {reviews.length === 0 && (
            <p className="py-8 text-sm text-muted-foreground">No reviews yet — be the first to share your thoughts.</p>
          )}
          {reviews.map((review) => (
            <li key={String(review._id)} className="flex flex-col gap-3 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-medium uppercase">{review.userName?.[0] ?? 'B'}</span>
                  <div>
                    <p className="text-sm font-medium">{review.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.createdAt ?? Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      {review.verifiedPurchase && <span className="ml-2 text-accent">✓ Verified purchase</span>}
                    </p>
                  </div>
                </div>
                <RatingStars rating={review.rating} size={13} />
              </div>
              {review.title && <p className="text-sm font-medium">{review.title}</p>}
              <p className="text-sm leading-7 text-muted-foreground">{review.comment}</p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-6 text-xs font-medium uppercase tracking-lux-sm">Write a review</h3>
        {!isAuthenticated ? (
          <div className="border border-border p-8 text-center">
            <p className="font-display text-2xl font-medium">Join the conversation</p>
            <p className="mt-2 text-sm text-muted-foreground">Sign in to share your experience with this piece.</p>
            <Button asChild variant="outline" className="mt-6">
              <a href="/login">Sign in</a>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-lux-sm">Your rating</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    aria-label={`${star} stars`}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                  >
                    <StarFilled active={star <= rating} />
                  </button>
                ))}
              </div>
            </div>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Review title (optional)" className="input-lux" />
            <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Tell us about the fit, fabric and feel…" className="input-lux min-h-32" />
            <Button type="submit" variant="dark" disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit review'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function StarFilled({ active }: { active: boolean }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        className={active ? 'fill-accent stroke-accent' : 'fill-transparent stroke-muted-foreground/40'}
      />
    </svg>
  );
}
