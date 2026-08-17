import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, ShoppingBag, Trash2, Ticket, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { productService } from '@/services/product.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { SafeImage } from '@/components/shared/SafeImage';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageMeta } from '@/lib/seo';
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_RATE, TAX_RATE } from '@/lib/pricing';
import { useBrandName } from '@/context/SettingsContext';
import { useCurrency } from '@/context/CurrencyContext';

export default function CartPage() {
  const { cart, isLoading, updateQuantity, removeItem, applyCoupon, removeCoupon, isUpdating } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const brandName = useBrandName();
  const { formatPrice } = useCurrency();
  const [couponCode, setCouponCode] = useState('');
  const [applying, setApplying] = useState(false);

  usePageMeta({ title: `Shopping Bag — ${brandName}` });

  const items = cart?.items ?? [];

  const { data: cartProducts } = useQuery({
    queryKey: ['cart', 'products', items.map((item) => String(item.productId)).join(',')],
    queryFn: () => productService.getByIds(items.map((item) => String(item.productId))),
    enabled: items.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const slugById = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of cartProducts ?? []) map.set(String(product._id), product.slug);
    return map;
  }, [cartProducts]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplying(true);
    try {
      await applyCoupon(couponCode.trim());
      toast.success('Coupon applied');
      setCouponCode('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid coupon code');
    } finally {
      setApplying(false);
    }
  };

  const goToCheckout = () => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
      return;
    }
    navigate('/checkout');
  };

  if (isLoading) {
    return (
      <div className="container-lux py-36">
        <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-6">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="Your Bag" breadcrumb={[{ label: 'Bag' }]} />
        <section className="bg-background pb-24">
          <div className="container-lux">
            <EmptyState
              icon={<ShoppingBag className="h-7 w-7" />}
              title="Your bag is empty"
              description="The new season is waiting. Discover pieces made to be worn for years, not seasons."
              action={{ label: 'Shop the collection', to: '/shop' }}
            />
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Shopping Bag" description={`${cart?.totalItems ?? 0} item${(cart?.totalItems ?? 0) === 1 ? '' : 's'} in your bag`} breadcrumb={[{ label: 'Bag' }]} />

      <section className="bg-background pb-24">
        <div className="container-lux">
          <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
            <div>
              <ul className="flex flex-col divide-y divide-border border-y border-border">
                {items.map((item) => {
                  const productSlug = slugById.get(String(item.productId));
                  return (
                    <li key={`${String(item.productId)}-${item.variantId ?? 'default'}`} className="flex gap-6 py-8">
                      {productSlug ? (
                        <Link to={`/product/${productSlug}`} className="block h-44 w-36 shrink-0 bg-secondary">
                          <SafeImage src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        </Link>
                      ) : (
                        <div className="h-44 w-36 shrink-0 bg-secondary">
                          <SafeImage src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-display text-xl font-medium">{item.name}</h3>
                            {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {Object.entries(item.selectedOptions).map(([key, value]) => `${key}: ${value}`).join(' · ')}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            aria-label="Remove item"
                            onClick={() => removeItem(item).catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Could not remove item'))}
                            className="text-muted-foreground transition-colors hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-auto flex items-center justify-between pt-6">
                          <div className="flex items-center border border-border">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => updateQuantity(item, item.quantity - 1)}
                              className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-secondary"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="flex h-10 w-14 items-center justify-center text-sm">{item.quantity}</span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() => updateQuantity(item, item.quantity + 1)}
                              className="flex h-10 w-10 items-center justify-center transition-colors hover:bg-secondary"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="text-base font-medium">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 flex items-center gap-3">
                <input
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="Coupon code"
                  className="input-lux max-w-xs uppercase"
                />
                <Button variant="outline" onClick={handleApplyCoupon} disabled={applying || !couponCode.trim()}>
                  {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                  Apply
                </Button>
              </div>
              {cart?.couponCode && (
                <div className="mt-3 flex items-center gap-3 text-sm">
                  <span className="uppercase tracking-lux-sm text-accent">Coupon applied: {cart.couponCode}</span>
                  <button type="button" onClick={removeCoupon} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-destructive">
                    Remove
                  </button>
                </div>
              )}
            </div>

            <aside className="h-fit border border-border p-8 lg:sticky lg:top-28">
              <h2 className="mb-6 text-xs font-medium uppercase tracking-lux-sm">Order summary</h2>
              <dl className="flex flex-col gap-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(cart?.subtotal ?? 0)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Shipping</dt>
                  <dd>{cart && cart.subtotal >= FREE_SHIPPING_THRESHOLD ? 'Free' : formatPrice(cart?.shipping ?? FLAT_SHIPPING_RATE)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Tax ({Math.round(TAX_RATE * 100)}%)</dt>
                  <dd>{formatPrice(cart?.tax ?? 0)}</dd>
                </div>
                {cart && cart.discount > 0 && (
                  <div className="flex justify-between text-accent">
                    <dt>Discount</dt>
                    <dd>−{formatPrice(cart.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-4 text-base font-medium">
                  <dt>Total</dt>
                  <dd>{formatPrice(cart?.total ?? 0)}</dd>
                </div>
              </dl>
              {cart && cart.subtotal < FREE_SHIPPING_THRESHOLD && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Add {formatPrice(FREE_SHIPPING_THRESHOLD - cart.subtotal)} more to unlock complimentary shipping.
                </p>
              )}
              <Button variant="gold" size="lg" className="mt-6 w-full" onClick={goToCheckout} disabled={isUpdating}>
                {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                Proceed to checkout
              </Button>
              <Button asChild variant="ghost" className="mt-2 w-full">
                <a href="/shop">Continue shopping</a>
              </Button>
              <p className="mt-4 text-center text-[10px] uppercase tracking-lux-sm text-muted-foreground">Secure checkout · Stripe & Razorpay</p>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
