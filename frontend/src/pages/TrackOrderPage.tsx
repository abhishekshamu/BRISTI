import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PackageSearch, Truck, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { usePageMeta } from '@/lib/seo';
import { orderService } from '@/services/order.service';
import { useBrandName } from '@/context/SettingsContext';
import { useCurrency } from '@/context/CurrencyContext';
import type { Order } from '@shared/types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function TrackOrderPage() {
  const brandName = useBrandName();
  const { formatPrice } = useCurrency();
  usePageMeta({ title: `Track Order — ${brandName}`, description: `Follow your ${brandName} order from atelier to your door.` });
  const { isAuthenticated } = useAuth();
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const trackingRef = useRef(false);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = orderNumber.trim();
    if (!value || trackingRef.current) return;
    trackingRef.current = true;
    setLoading(true);
    setOrder(null);
    try {
      const result = await orderService.track(value);
      setOrder(result);
    } catch {
      toast.error('No order found with that order number.');
    } finally {
      trackingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Follow your pieces"
        title="Track Your Order"
        description="From atelier to your door — every BRISTI order is traceable."
        breadcrumb={[{ label: 'Track Order' }]}
      />

      <section className="bg-background pb-24">
        <div className="container-lux">
          <div className="mx-auto max-w-xl border border-border p-10">
            <form onSubmit={handleTrack} className="flex flex-col gap-4">
              <label htmlFor="order-number" className="text-sm font-medium tracking-wide">
                Order number
              </label>
              <div className="flex gap-3">
                <input
                  id="order-number"
                  name="orderNumber"
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="e.g. BRS-20260101-12345678"
                  className="w-full border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={loading || !orderNumber.trim()}
                  className="btn-lux-gold shrink-0 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Track'}
                </button>
              </div>
            </form>

            {order ? (
              <div className="mt-8 border-t border-border pt-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Order</p>
                    <p className="font-display text-lg">{order.orderNumber}</p>
                  </div>
                  <span className="rounded-full bg-secondary px-4 py-1 text-sm">
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </div>

                {order.trackingNumber && (
                  <a
                    href={order.trackingUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className={`mt-6 flex items-center gap-3 border border-border p-4 text-sm ${order.trackingUrl ? 'hover:border-primary' : 'pointer-events-none'}`}
                  >
                    <Truck className="h-5 w-5" />
                    <span>
                      Carrier tracking <span className="font-medium">{order.trackingNumber}</span>
                    </span>
                  </a>
                )}

                <ul className="mt-6 space-y-3">
                  {order.items?.map((item: any, index: number) => (
                    <li key={index} className="flex items-center justify-between border-b border-border pb-3 text-sm last:border-0">
                      <span>
                        {item.productName} <span className="text-muted-foreground">× {item.quantity}</span>
                      </span>
                      <span>{formatPrice(Number(item.price ?? 0))}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-6 text-xs leading-6 text-muted-foreground">
                  Ordered {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}. For questions about this order,{' '}
                  <Link to="/contact" className="underline">contact us</Link>.
                </p>
              </div>
            ) : (
              <div className="mt-8 border-t border-border pt-8 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                  <PackageSearch className="h-6 w-6" />
                </span>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Enter your order number above to see its live status and carrier tracking.
                </p>
                {isAuthenticated && (
                  <Link to="/account/orders" className="btn-lux-outline mt-4">
                    My orders
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}