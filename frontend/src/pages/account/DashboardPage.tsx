import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, Heart, Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { orderService } from '@/services/order.service';
import { notificationService } from '@/services/engagement.service';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/lib/utils';
import { useCurrency } from '@/context/CurrencyContext';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '@shared/constants';

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const { productIds } = useWishlist();
  const { formatPrice } = useCurrency();

  const { data: ordersPage, isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: () => orderService.myOrders(String(user?.id), { limit: 5 }),
    enabled: Boolean(user),
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: notificationService.count,
    enabled: Boolean(user),
  });

  const orders = ordersPage?.data ?? [];
  const recentOrder = orders[0];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/account/orders" className="group flex items-center gap-4 border border-border p-6 transition-colors hover:border-accent">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground group-hover:text-accent">
            <Package className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-2xl font-medium">{ordersLoading ? '—' : ordersPage?.pagination?.total ?? orders.length}</span>
            <span className="text-[10px] uppercase tracking-lux-sm text-muted-foreground">Orders</span>
          </span>
        </Link>
        <Link to="/account/wishlist" className="group flex items-center gap-4 border border-border p-6 transition-colors hover:border-accent">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground group-hover:text-accent">
            <Heart className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-2xl font-medium">{productIds.length}</span>
            <span className="text-[10px] uppercase tracking-lux-sm text-muted-foreground">Saved pieces</span>
          </span>
        </Link>
        <div className="flex items-center gap-4 border border-border p-6">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-muted-foreground">
            <Bell className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-2xl font-medium">{unreadCount ?? 0}</span>
            <span className="text-[10px] uppercase tracking-lux-sm text-muted-foreground">Notifications</span>
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-lux-sm">Recent orders</h2>
            <Link to="/account/orders" className="text-xs text-accent underline underline-offset-4">
              View all
            </Link>
          </div>

          {ordersLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : orders.length === 0 ? (
            <div className="border border-border p-10 text-center">
              <p className="font-display text-2xl font-medium">No orders yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Your first order is just a click away.</p>
              <Link to="/shop" className="btn-lux-outline mt-6 inline-block">
                Start shopping
              </Link>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border border border-border">
              {orders.map((order) => {
                const status = ORDER_STATUSES.find((item) => item.value === order.status);
                const payment = PAYMENT_STATUSES.find((item) => item.value === order.paymentStatus);
                return (
                  <li key={String(order._id)}>
                    <Link to={`/account/orders/${order.orderNumber}`} className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 transition-colors hover:bg-secondary/50">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">{order.orderNumber}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(order.createdAt ?? Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          {' · '}
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium">{formatPrice(order.total)}</span>
                        <Badge variant={order.status === 'cancelled' ? 'destructive' : order.status === 'delivered' ? 'success' : order.status === 'pending' ? 'muted' : 'gold'}>
                          {status?.label ?? order.status}
                        </Badge>
                        <span className="hidden text-xs text-muted-foreground sm:block">{payment?.label}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <div className="border border-border p-6">
            <h2 className="mb-4 text-xs font-medium uppercase tracking-lux-sm">Your profile</h2>
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 font-display text-xl text-accent">
                {getInitials(`${profile?.firstName ?? user?.firstName} ${profile?.lastName ?? user?.lastName}`)}
              </span>
              <div>
                <p className="font-medium">
                  {profile?.firstName ?? user?.firstName} {profile?.lastName ?? user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{profile?.email ?? user?.email}</p>
                {profile?.phone && <p className="text-xs text-muted-foreground">{profile.phone}</p>}
              </div>
            </div>
            <Link to="/account/profile" className="mt-5 inline-block text-xs text-accent underline underline-offset-4">
              Edit profile
            </Link>
          </div>

          {recentOrder && (
            <div className="border border-border p-6">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-lux-sm">Latest order</h2>
              <p className="text-sm font-medium">{recentOrder.orderNumber}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {recentOrder.items.map((item) => item.productName).join(', ')}
              </p>
              <Link to={`/account/orders/${recentOrder.orderNumber}`} className="mt-4 inline-block text-xs text-accent underline underline-offset-4">
                Track this order
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
