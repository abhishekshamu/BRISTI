import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PackageOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { orderService } from '@/services/order.service';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Pagination } from '@/components/ui/pagination';
import { formatPrice } from '@/lib/utils';
import { ORDER_STATUSES } from '@shared/constants';

const PAGE_SIZE = 10;

export default function OrdersPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', 'mine', 'all', page],
    queryFn: () => orderService.myOrders(String(user?.id), { page, limit: PAGE_SIZE }),
    enabled: Boolean(user),
  });

  const orders = data?.data ?? [];
  const pages = data?.pagination?.pages ?? 1;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (error || orders.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen className="h-7 w-7" />}
        title="No orders yet"
        description="Your order history will appear here. The first chapter of your BRISTI story awaits."
        action={{ label: 'Shop the collection', to: '/shop' }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xs font-medium uppercase tracking-lux-sm">Order history</h2>
      <ul className="flex flex-col divide-y divide-border border border-border">
        {orders.map((order) => {
          const status = ORDER_STATUSES.find((item) => item.value === order.status);
          return (
            <li key={String(order._id)}>
              <Link to={`/account/orders/${order.orderNumber}`} className="flex flex-wrap items-center justify-between gap-4 px-6 py-6 transition-colors hover:bg-secondary/50">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">{order.orderNumber}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(order.createdAt ?? Date.now()).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {order.items.map((item) => `${item.productName} ×${item.quantity}`).join(', ')}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-base font-medium">{formatPrice(order.total)}</span>
                  <Badge variant={order.status === 'cancelled' ? 'destructive' : order.status === 'delivered' ? 'success' : order.status === 'pending' ? 'muted' : 'gold'}>
                    {status?.label ?? order.status}
                  </Badge>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <Pagination page={page} pages={pages} onPageChange={setPage} />
    </div>
  );
}
