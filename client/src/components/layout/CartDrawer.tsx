import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useUIStore } from '@/store/useUIStore';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { formatPrice, getImageUrl, slugifyText } from '@/lib/utils';
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_RATE } from '@/lib/pricing';

export function CartDrawer() {
  const { isCartDrawerOpen, closeCartDrawer } = useUIStore();
  const { cart, updateQuantity, removeItem, isUpdating, applyCoupon } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  const items = cart?.items ?? [];

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setApplyingCoupon(true);
    setCouponError(null);
    try {
      await applyCoupon(code);
      toast.success('Coupon applied');
      setCouponCode('');
    } catch (error) {
      setCouponError(error instanceof Error ? error.message : 'That coupon code is not valid');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleUpdateQuantity = async (item: (typeof items)[number], quantity: number) => {
    try {
      await updateQuantity(item, quantity);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update quantity');
    }
  };

  const handleRemove = async (item: (typeof items)[number]) => {
    try {
      await removeItem(item);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove item');
    }
  };

  const goToCheckout = () => {
    closeCartDrawer();
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
      return;
    }
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isCartDrawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm"
            onClick={closeCartDrawer}
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.35, ease: 'easeOut' }}
            className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-md flex-col bg-background"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
              <h2 className="flex items-center gap-2 text-xs font-medium uppercase tracking-lux-sm">
                <ShoppingBag className="h-4 w-4" /> Shopping bag {cart?.totalItems ? `(${cart.totalItems})` : ''}
              </h2>
              <button type="button" aria-label="Close bag" onClick={closeCartDrawer} className="flex h-10 w-10 items-center justify-center">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-6 px-8 text-center">
                  <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                  <p className="font-display text-2xl font-medium">Your bag is empty</p>
                  <p className="text-sm leading-6 text-muted-foreground">Discover the new season and find pieces made to be loved.</p>
                  <button
                    type="button"
                    onClick={() => {
                      closeCartDrawer();
                      navigate('/shop');
                    }}
                    className="btn-lux-outline"
                  >
                    Shop the collection
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((item) => {
                    const image = getImageUrl(item.image);
                    return (
                      <li key={`${String(item.productId)}-${item.variantId ?? 'default'}`} className="flex gap-4 px-6 py-5">
                        <button
                          type="button"
                          onClick={() => {
                            closeCartDrawer();
                            navigate(`/product/${encodeURIComponent(slugifyText(item.name))}`);
                          }}
                          className="h-24 w-20 shrink-0 bg-secondary"
                        >
                          {image && <img src={image} alt={item.name} className="h-full w-full object-cover" />}
                        </button>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{item.name}</p>
                              {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {Object.entries(item.selectedOptions).map(([key, value]) => `${key}: ${value}`).join(' · ')}
                                </p>
                              )}
                            </div>
                            <button type="button" aria-label="Remove" onClick={() => handleRemove(item)} className="text-muted-foreground transition-colors hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-auto flex items-center justify-between pt-3">
                            <div className="flex items-center border border-border">
                              <button
                                type="button"
                                aria-label="Decrease quantity"
                                onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                                className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-secondary"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="flex h-8 w-10 items-center justify-center text-sm">{item.quantity}</span>
                              <button
                                type="button"
                                aria-label="Increase quantity"
                                onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                                className="flex h-8 w-8 items-center justify-center transition-colors hover:bg-secondary"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <span className="text-sm font-medium">{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="shrink-0 border-t border-border px-6 py-5">
                {!cart?.couponCode && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2">
                      <input
                        value={couponCode}
                        onChange={(event) => setCouponCode(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') handleApplyCoupon();
                        }}
                        placeholder="Coupon code"
                        aria-label="Coupon code"
                        className="h-9 w-full border border-border bg-transparent px-3 text-sm outline-none transition-colors focus:border-accent"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={applyingCoupon || !couponCode.trim()}
                        className="btn-lux-outline h-9 shrink-0 px-4 text-[11px] uppercase tracking-lux-sm"
                      >
                        {applyingCoupon ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
                      </button>
                    </div>
                    {couponError && <p className="mt-2 text-xs text-destructive">{couponError}</p>}
                  </div>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatPrice(cart?.subtotal ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span>{cart && cart.subtotal >= FREE_SHIPPING_THRESHOLD ? 'Free' : formatPrice(cart?.shipping ?? FLAT_SHIPPING_RATE)}</span>
                  </div>
                  {cart && cart.discount > 0 && (
                    <div className="flex justify-between text-accent">
                      <span>{cart.couponCode ? `Coupon ${cart.couponCode.toUpperCase()}` : 'Discount'}</span>
                      <span>−{formatPrice(cart.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
                    <span>Total</span>
                    <span>{formatPrice(cart?.total ?? 0)}</span>
                  </div>
                </div>
                {cart && cart.subtotal < 100 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    You're {formatPrice(100 - cart.subtotal)} away from complimentary shipping.
                  </p>
                )}
                <button type="button" onClick={goToCheckout} className="btn-lux-gold mt-5 w-full" disabled={isUpdating}>
                  {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Proceed to checkout
                </button>
                <button type="button" onClick={() => { closeCartDrawer(); navigate('/cart'); }} className="btn-lux-ghost mt-2 w-full">
                  View bag
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
