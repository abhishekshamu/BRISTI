import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Package, PackageCheck, Truck } from 'lucide-react';
import { usePageMeta } from '@/lib/seo';
import { formatPrice } from '@/lib/utils';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@shared/constants';
import type { Order } from '@shared/types';

export default function OrderConfirmationPage() {
  const { orderNumber = '' } = useParams<{ orderNumber: string }>();
  const location = useLocation();
  const order = (location.state as { order?: Order } | null)?.order;

  usePageMeta({ title: `Order ${orderNumber} — BRISTI`, description: 'Your order has been placed. Thank you for shopping with BRISTI.' });

  useEffect(() => {
    if (!order) {
      window.scrollTo({ top: 0 });
    }
  }, [order]);

  if (!order) {
    return (
      <div className="container-lux flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
        <p className="font-display text-3xl font-medium">Order {orderNumber}</p>
        <p className="max-w-md text-sm leading-7 text-muted-foreground">
          We couldn't find the details of this order in this browser session. Sign in to your account to view all your orders.
        </p>
        <Link to="/account/orders" className="btn-lux-outline">
          View my orders
        </Link>
      </div>
    );
  }

  const statusLabel = ORDER_STATUSES.find((status) => status.value === order.status)?.label ?? order.status;
  const paymentLabel = PAYMENT_STATUSES.find((status) => status.value === order.paymentStatus)?.label ?? order.paymentStatus;

  return (
    <div className="container-lux pb-24 pt-36">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center gap-5 text-center"
      >
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 14 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent"
        >
          <Check className="h-9 w-9" />
        </motion.span>
        <p className="text-[11px] font-medium uppercase tracking-lux-sm text-accent">Order confirmed</p>
        <h1 className="font-display text-4xl font-medium sm:text-5xl">Thank you, {order.shippingAddress?.firstName}</h1>
        <p className="max-w-xl text-sm leading-7 text-muted-foreground">
          Order <span className="font-medium text-foreground">{order.orderNumber}</span> has been placed. A confirmation has been sent to your email, and your pieces are being prepared in the atelier.
        </p>

        <div className="mt-4 grid w-full max-w-3xl grid-cols-3 gap-2 sm:gap-4">
          {[
            { icon: Package, label: 'Confirmed', active: true },
            { icon: Truck, label: 'Preparing shipment', active: false },
            { icon: PackageCheck, label: 'Delivered', active: false },
          ].map(({ icon: Icon, label, active }, index) => (
            <div key={label} className="flex flex-col items-center gap-3 border border-border p-5">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${active ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'}`}>
                <Icon className="h-5 w-5" />
              </span>
              <p className={`text-center text-[10px] font-medium uppercase tracking-lux-sm ${active ? 'text-accent' : 'text-muted-foreground'}`}>
                {index + 1}. {label}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      <div className="mx-auto mt-14 grid max-w-5xl gap-8 lg:grid-cols-[1fr_360px]">
        <div className="border border-border p-8">
          <h2 className="mb-6 text-xs font-medium uppercase tracking-lux-sm">Order summary</h2>
          <ul className="flex flex-col divide-y divide-border">
            {order.items.map((item) => (
              <li key={String(item.productId) + item.sku} className="flex items-center gap-4 py-5">
                <div className="flex h-20 w-16 shrink-0 items-center justify-center bg-secondary text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  BRISTI
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-sm font-medium">{item.productName}</p>
                  {item.variantName && <p className="text-xs text-muted-foreground">{item.variantName}</p>}
                  <p className="text-xs text-muted-foreground">Qty {item.quantity} · {item.sku}</p>
                </div>
                <span className="text-sm font-medium">{formatPrice(item.total)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 flex flex-col gap-3 border-t border-border pt-5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <dt>Subtotal</dt>
              <dd>{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Shipping</dt>
              <dd>{order.shipping === 0 ? 'Free' : formatPrice(order.shipping)}</dd>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <dt>Tax</dt>
              <dd>{formatPrice(order.tax)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-accent">
                <dt>Discount</dt>
                <dd>−{formatPrice(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-4 text-base font-medium">
              <dt>Total</dt>
              <dd>{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col gap-6">
          <div className="border border-border p-8">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-lux-sm">Shipping to</h2>
            <address className="text-sm not-italic leading-6 text-muted-foreground">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              <br />
              {order.shippingAddress.addressLine1}
              {order.shippingAddress.addressLine2 && (
                <>
                  <br />
                  {order.shippingAddress.addressLine2}
                </>
              )}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country}
              <br />
              {order.shippingAddress.phone}
            </address>
          </div>
          <div className="border border-border p-8">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-lux-sm">Payment</h2>
            <p className="text-sm text-muted-foreground">
              Method: <span className="uppercase">{order.paymentMethod}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Status: <span className="text-accent">{paymentLabel}</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Order status: <span className="text-foreground">{statusLabel}</span>
            </p>
          </div>
          <Link to="/shop" className="btn-lux-outline w-full">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
