import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Truck, PackageCheck, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { orderService } from '@/services/order.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/shared/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrency } from '@/context/CurrencyContext';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@shared/constants';

const STEPS = [
  { status: 'pending', label: 'Order placed', icon: Package },
  { status: 'processing', label: 'In the atelier', icon: Package },
  { status: 'shipped', label: 'Shipped', icon: Truck },
  { status: 'delivered', label: 'Delivered', icon: PackageCheck },
];

export default function OrderDetailPage() {
  const { orderNumber = '' } = useParams<{ orderNumber: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [cancelling, setCancelling] = useState(false);
  const { formatPrice } = useCurrency();

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['orders', 'detail', orderNumber],
    queryFn: () => orderService.getByOrderNumber(orderNumber),
    enabled: Boolean(user),
    retry: false,
  });

  const handleCancel = async () => {
    if (!order) return;
    setCancelling(true);
    try {
      await orderService.cancel(String(order._id));
      toast.success('Order cancelled', { description: 'Your payment will be refunded within 5–7 business days.' });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not cancel the order');
    } finally {
      setCancelling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !order) {
    return <ErrorState message="This order could not be found in your account." onRetry={() => refetch()} />;
  }

  const statusIndex = STEPS.findIndex((step) => step.status === order.status);
  const activeStep = statusIndex === -1 ? -1 : statusIndex;
  const cancelled = order.status === 'cancelled' || order.status === 'returned' || order.status === 'refunded';

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-[11px] font-medium uppercase tracking-lux-sm text-accent">Order details</p>
          <h2 className="font-display text-3xl font-medium">{order.orderNumber}</h2>
          <p className="text-sm text-muted-foreground">
            Placed on {new Date(order.createdAt ?? Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={order.status === 'cancelled' ? 'destructive' : order.status === 'delivered' ? 'success' : 'gold'}>
            {ORDER_STATUSES.find((item) => item.value === order.status)?.label ?? order.status}
          </Badge>
          {!cancelled && (order.status === 'pending' || order.status === 'processing') && (
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={cancelling}>
              {cancelling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Cancel order
            </Button>
          )}
        </div>
      </div>

      <div className="border border-border p-8">
        {cancelled ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <XCircle className="h-8 w-8 text-destructive" />
            <p className="font-display text-2xl font-medium">Order {ORDER_STATUSES.find((item) => item.value === order.status)?.label?.toLowerCase()}</p>
            <p className="text-sm text-muted-foreground">
              {order.status === 'cancelled' ? 'This order has been cancelled. Refunds are processed within 5–7 business days.' : 'This order has been returned or refunded.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-4">
            {STEPS.map(({ status, label, icon: Icon }, index) => {
              const completed = index <= activeStep;
              return (
                <div key={status} className="flex flex-col items-center gap-3 text-center">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${completed ? 'border-accent bg-accent text-accent-foreground' : 'border-border text-muted-foreground/50'}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className={`text-[10px] font-medium uppercase tracking-lux-sm ${completed ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                    {index + 1}. {label}
                  </p>
                  {index < STEPS.length - 1 && <span className={`hidden h-0.5 w-full sm:block ${index < activeStep ? 'bg-accent' : 'bg-border'}`} />}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="border border-border p-8">
          <h3 className="mb-6 text-xs font-medium uppercase tracking-lux-sm">Items</h3>
          <ul className="flex flex-col divide-y divide-border">
            {order.items.map((item) => (
              <li key={String(item.productId) + item.sku} className="flex items-center justify-between gap-4 py-5">
                <div>
                  <p className="text-sm font-medium">{item.productName}</p>
                  {item.variantName && <p className="mt-0.5 text-xs text-muted-foreground">{item.variantName}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">Qty {item.quantity} · {item.sku}</p>
                </div>
                <span className="text-sm font-medium">{formatPrice(item.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 flex flex-col gap-3 border-t border-border pt-5 text-sm">
            <div className="flex justify-between text-muted-foreground"><dt>Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>Shipping</dt><dd>{order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}</dd></div>
            <div className="flex justify-between text-muted-foreground"><dt>Tax</dt><dd>{formatPrice(order.tax)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-accent"><dt>Discount</dt><dd>−{formatPrice(order.discount)}</dd></div>}
            <div className="flex justify-between border-t border-border pt-4 text-base font-medium"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
          </dl>
        </div>

        <div className="flex flex-col gap-6">
          <div className="border border-border p-8">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-lux-sm">Shipping address</h3>
            <address className="text-sm not-italic leading-6 text-muted-foreground">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              <br />
              {order.shippingAddress.addressLine1}
              {order.shippingAddress.addressLine2 && (<><br />{order.shippingAddress.addressLine2}</>)}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country}
              <br />
              {order.shippingAddress.phone}
            </address>
          </div>
          <div className="border border-border p-8">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-lux-sm">Payment</h3>
            <p className="text-sm text-muted-foreground">
              Method: <span className="uppercase">{order.paymentMethod}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Status: <span className="text-accent">{PAYMENT_STATUSES.find((item) => item.value === order.paymentStatus)?.label ?? order.paymentStatus}</span>
            </p>
            {order.trackingNumber && (
              <p className="mt-4 border-t border-border pt-4 text-sm">
                Tracking: <span className="font-medium">{order.trackingNumber}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
