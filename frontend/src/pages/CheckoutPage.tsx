import { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CreditCard, Landmark, Banknote, Lock, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { orderService } from '@/services/order.service';
import { paymentService } from '@/services/payment.service';
import { PageHeader } from '@/components/shared/PageHeader';
import { SafeImage } from '@/components/shared/SafeImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { usePageMeta } from '@/lib/seo';
import { formatPrice } from '@/lib/utils';
import { computeTotals, TAX_RATE } from '@/lib/pricing';
import { useBrandName } from '@/context/SettingsContext';

type PaymentMethod = 'stripe' | 'razorpay' | 'cod';

const PAYMENT_METHODS: Array<{ id: PaymentMethod; label: string; description: string; icon: typeof CreditCard }> = [
  { id: 'stripe', label: 'Credit / Debit Card', description: 'Secured by Stripe', icon: CreditCard },
  { id: 'razorpay', label: 'Razorpay', description: 'UPI, cards, net banking & wallets', icon: Landmark },
  { id: 'cod', label: 'Cash on Delivery', description: 'Pay when it arrives', icon: Banknote },
];

interface AddressForm {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

const EMPTY_ADDRESS: AddressForm = {
  firstName: '',
  lastName: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'United States',
  phone: '',
};

export default function CheckoutPage() {
  const { isAuthenticated, profile, isLoading: authLoading, user } = useAuth();
  const brandName = useBrandName();
  const { cart, clear } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [shipping, setShipping] = useState<AddressForm>(() => {
    const defaultAddress = profile?.addresses?.find((address) => address.isDefault) ?? profile?.addresses?.[0];
    if (defaultAddress) {
      return {
        firstName: defaultAddress.firstName || user?.firstName || '',
        lastName: defaultAddress.lastName || user?.lastName || '',
        addressLine1: defaultAddress.addressLine1 ?? '',
        addressLine2: defaultAddress.addressLine2 ?? '',
        city: defaultAddress.city ?? '',
        state: defaultAddress.state ?? '',
        postalCode: defaultAddress.postalCode ?? '',
        country: defaultAddress.country ?? 'United States',
        phone: defaultAddress.phone ?? profile?.phone ?? '',
      };
    }
    return { ...EMPTY_ADDRESS, firstName: user?.firstName ?? '', lastName: user?.lastName ?? '', phone: profile?.phone ?? '' };
  });
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('stripe');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'shipping' | 'payment'>('shipping');

  usePageMeta({ title: `Checkout — ${brandName}` });

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const totals = computeTotals(subtotal, cart?.discount ?? 0, items.length);
  const summary = useMemo(
    () => ({ ...totals, discount: cart?.discount ?? 0, subtotal }),
    [totals, cart?.discount, subtotal],
  );

  if (authLoading) {
    return (
      <div className="container-lux py-36">
        <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
          <div className="flex flex-col gap-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-2">
                <div className="h-3 w-24 animate-pulse rounded bg-secondary" />
                <div className="h-12 w-full animate-pulse rounded bg-secondary" />
              </div>
            ))}
          </div>
          <div className="h-96 animate-pulse bg-secondary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login?redirect=/checkout" replace />;
  }

  if (items.length === 0) {
    return (
      <>
        <PageHeader title="Checkout" breadcrumb={[{ label: 'Checkout' }]} />
        <div className="container-lux pb-24 text-center">
          <p className="font-display text-3xl font-medium">Your bag is empty</p>
          <Button asChild variant="outline" className="mt-6">
            <a href="/shop">Continue shopping</a>
          </Button>
        </div>
      </>
    );
  }

  const setField = (field: keyof AddressForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setShipping((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const validateShipping = (): boolean => {
    const required: Array<keyof AddressForm> = ['firstName', 'lastName', 'addressLine1', 'city', 'state', 'postalCode', 'country', 'phone'];
    for (const field of required) {
      if (!shipping[field].trim()) {
        toast.error(`Please fill in ${field === 'addressLine1' ? 'address' : field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
        return false;
      }
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (step === 'shipping') {
      if (!validateShipping()) return;
      setStep('payment');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!user) return;
    setSubmitting(true);
    try {
      const order = await orderService.create({
        userId: String(user.id),
        items: items.map((item) => ({
          productId: String(item.productId),
          variantId: item.variantId,
          quantity: item.quantity,
          selectedOptions: item.selectedOptions,
        })),
        shippingAddress: { ...shipping },
        paymentMethod,
        couponCode: cart?.couponCode,
        notes: notes.trim() || undefined,
      });

      if (paymentMethod === 'stripe') {
        try {
          await paymentService.createStripeIntent({ amount: summary.total, orderId: String(order._id) });
        } catch {
          // gateway intent creation failed - order remains pending
        }
      } else if (paymentMethod === 'razorpay') {
        try {
          await paymentService.createRazorpayOrder({ amount: summary.total, orderId: String(order._id) });
        } catch {
          // gateway order creation failed - order remains pending
        }
      }

      try {
        await paymentService.createPayment({
          orderId: String(order._id),
          userId: String(user.id),
          amount: summary.total,
          method: paymentMethod,
        });
      } catch {
        // payment record is advisory; order is already created
      }

      await clear();
      await queryClient.invalidateQueries({ queryKey: ['orders'] });
      navigate(`/order/${order.orderNumber}`, { state: { order } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not place your order');
    } finally {
      setSubmitting(false);
    }
  };

  const StepIndicator = (
    <div className="mb-10 flex items-center gap-4 text-xs uppercase tracking-lux-sm">
      {(['shipping', 'payment'] as const).map((name, index) => (
        <div key={name} className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => index === 0 && step === 'payment' && setStep('shipping')}
            className={`flex items-center gap-2 ${step === name ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] ${
                step === name ? 'border-accent bg-accent text-accent-foreground' : index === 0 ? 'border-accent text-accent' : 'border-border'
              }`}
            >
              {index === 0 && step === 'payment' ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            {name === 'shipping' ? 'Shipping' : 'Payment'}
          </button>
          {index === 0 && <span className="h-px w-10 bg-border" />}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader title="Checkout" breadcrumb={[{ label: 'Bag', to: '/cart' }, { label: 'Checkout' }]} />
      <section className="bg-background pb-24">
        <div className="container-lux">
          {StepIndicator}

          <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
            <div className="flex flex-col gap-10">
              {step === 'shipping' && (
                <div className="flex flex-col gap-6">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="firstName">First name *</Label>
                      <Input id="firstName" value={shipping.firstName} onChange={setField('firstName')} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="lastName">Last name *</Label>
                      <Input id="lastName" value={shipping.lastName} onChange={setField('lastName')} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="addressLine1">Address *</Label>
                    <Input id="addressLine1" value={shipping.addressLine1} onChange={setField('addressLine1')} placeholder="Street address" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="addressLine2">Apartment, suite, etc. (optional)</Label>
                    <Input id="addressLine2" value={shipping.addressLine2} onChange={setField('addressLine2')} />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="city">City *</Label>
                      <Input id="city" value={shipping.city} onChange={setField('city')} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="state">State / Province *</Label>
                      <Input id="state" value={shipping.state} onChange={setField('state')} />
                    </div>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="postalCode">Postal code *</Label>
                      <Input id="postalCode" value={shipping.postalCode} onChange={setField('postalCode')} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="country">Country *</Label>
                      <Input id="country" value={shipping.country} onChange={setField('country')} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="phone">Phone *</Label>
                      <Input id="phone" type="tel" value={shipping.phone} onChange={setField('phone')} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="notes">Order notes (optional)</Label>
                    <Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Gift wrapping, delivery instructions…" />
                  </div>
                </div>
              )}

              {step === 'payment' && (
                <div className="flex flex-col gap-6">
                  <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)} className="gap-3">
                    {PAYMENT_METHODS.map(({ id, label, description, icon: Icon }) => (
                      <label
                        key={id}
                        className={`flex cursor-pointer items-center gap-4 border p-5 transition-all ${
                          paymentMethod === id ? 'border-accent bg-accent/5' : 'border-border hover:border-foreground/40'
                        }`}
                      >
                        <RadioGroupItem value={id} className="border-foreground/40" />
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span className="flex flex-col">
                          <span className="text-sm font-medium">{label}</span>
                          <span className="text-xs text-muted-foreground">{description}</span>
                        </span>
                      </label>
                    ))}
                  </RadioGroup>

                  <div className="flex items-center gap-3 border border-border bg-secondary/50 p-4 text-xs text-muted-foreground">
                    <Lock className="h-4 w-4 shrink-0 text-accent" />
                    Your payment details are encrypted and processed securely. Orders with card payments are confirmed immediately; payment status updates appear in My Orders.
                  </div>

                  <button type="button" onClick={() => setStep('shipping')} className="text-left text-xs uppercase tracking-lux-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
                    ← Back to shipping
                  </button>
                </div>
              )}
            </div>

            <aside className="h-fit border border-border p-8 lg:sticky lg:top-28">
              <h2 className="mb-6 text-xs font-medium uppercase tracking-lux-sm">Your order</h2>
              <ul className="mb-6 flex flex-col gap-5">
                {items.map((item) => (
                  <li key={`${String(item.productId)}-${item.variantId ?? 'default'}`} className="flex gap-4">
                    <div className="relative h-20 w-16 shrink-0 bg-secondary">
                      <SafeImage src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[10px] text-background">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col justify-between py-0.5">
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {Object.entries(item.selectedOptions).map(([key, value]) => `${key}: ${value}`).join(' · ')}
                        </p>
                      )}
                      <p className="text-sm">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Separator />
              <dl className="flex flex-col gap-3 pt-5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <dt>Subtotal</dt>
                  <dd>{formatPrice(summary.subtotal)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Shipping</dt>
                  <dd>{summary.shipping === 0 ? 'Free' : formatPrice(summary.shipping)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Tax ({Math.round(TAX_RATE * 100)}%)</dt>
                  <dd>{formatPrice(summary.tax)}</dd>
                </div>
                {summary.discount > 0 && (
                  <div className="flex justify-between text-accent">
                    <dt>Discount</dt>
                    <dd>−{formatPrice(summary.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-4 text-base font-medium">
                  <dt>Total</dt>
                  <dd>{formatPrice(summary.total)}</dd>
                </div>
              </dl>
              <Button variant="gold" size="lg" className="mt-6 hidden w-full lg:block" onClick={handlePlaceOrder} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {step === 'shipping' ? 'Continue to payment' : `Place order · ${formatPrice(summary.total)}`}
              </Button>
              <p className="mt-4 text-center text-[10px] uppercase tracking-lux-sm text-muted-foreground">
                By placing your order you agree to our terms & privacy policy.
              </p>
            </aside>
          </div>

          <div className="sticky bottom-0 z-40 -mx-4 mt-6 border-t border-border bg-background px-4 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] sm:-mx-6 sm:px-6 lg:hidden pb-[env(safe-area-inset-bottom)]">
            <div className="flex items-center justify-between gap-4">
              <div className="shrink-0">
                <p className="text-[10px] uppercase tracking-lux-sm text-muted-foreground">Total</p>
                <p className="font-display text-2xl font-medium leading-tight">{formatPrice(summary.total)}</p>
              </div>
              <Button variant="gold" size="lg" className="min-w-44 flex-1 sm:flex-none sm:w-64" onClick={handlePlaceOrder} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {step === 'shipping' ? 'Continue to payment' : 'Place order'}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
