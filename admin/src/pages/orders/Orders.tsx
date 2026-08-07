import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, Eye } from 'lucide-react';
import PageShell from '../../components/ui/PageShell';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Badge, { type BadgeTone } from '../../components/ui/Badge';
import api, { getApiError } from '../../lib/api';
import toast from 'react-hot-toast';

interface Order {
  _id: string;
  orderNumber: string;
  guestEmail?: string;
  userId?: string;
  items: any[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: 'pending' | 'confirmed' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'refunded';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
  paymentMethod: string;
  createdAt: string;
}

const STATUS_TONES: Record<string, BadgeTone> = {
  delivered: 'green',
  processing: 'blue',
  packed: 'amber',
  confirmed: 'green',
  shipped: 'purple',
  pending: 'amber',
  cancelled: 'red',
  returned: 'purple',
  refunded: 'slate',
};

const PAYMENT_TONES: Record<string, BadgeTone> = {
  paid: 'green',
  pending: 'amber',
  failed: 'red',
  refunded: 'slate',
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchParams] = useSearchParams();
  const customerFilter = searchParams.get('customer');

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params: string[] = [`page=${page}`, 'limit=20'];
      if (statusFilter !== 'all') params.push(`status=${statusFilter}`);
      if (customerFilter) params.push(`customer=${customerFilter}`);
      const response = await api.get(`/orders/all?${params.join('&')}`);
      setOrders(response.data.data);
      setTotalPages(response.data.pagination?.pages || 1);
      setTotal(response.data.pagination?.total ?? response.data.data?.length ?? 0);
    } catch (error) {
      toast.error(getApiError(error, 'Failed to fetch orders'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, customerFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (order.guestEmail && order.guestEmail.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const exportCsv = () => {
    const rows = [
      ['Order', 'Customer', 'Items', 'Total', 'Status', 'Payment', 'Date'],
      ...filteredOrders.map((order) => [
        order.orderNumber,
        order.guestEmail || order.userId || '',
        String(order.items?.length ?? 0),
        String(order.total ?? 0),
        order.status ?? '',
        order.paymentStatus ?? '',
        order.createdAt ? new Date(order.createdAt).toISOString() : '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Orders exported');
  };

  const columns: Column<Order>[] = [
    {
      key: 'order',
      header: 'Order',
      render: (order) => (
        <Link
          to={`/orders/${order._id}`}
          className="text-slate-900 dark:text-slate-100 hover:text-slate-600 dark:hover:text-slate-300 font-medium"
        >
          #{order.orderNumber}
        </Link>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order) => <span className="text-slate-600 dark:text-slate-400">{order.guestEmail || 'Guest'}</span>,
    },
    {
      key: 'items',
      header: 'Items',
      render: (order) => <span className="text-slate-600 dark:text-slate-400">{order.items?.length || 0} items</span>,
    },
    {
      key: 'total',
      header: 'Total',
      render: (order) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          ${order.total?.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (order) => <Badge tone={STATUS_TONES[order.status] ?? 'slate'}>{order.status}</Badge>,
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (order) => <Badge tone={PAYMENT_TONES[order.paymentStatus] ?? 'slate'}>{order.paymentStatus}</Badge>,
    },
    {
      key: 'date',
      header: 'Date',
      render: (order) => (
        <span className="text-slate-500 dark:text-slate-400">
          {new Date(order.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (order) => (
        <Link to={`/orders/${order._id}`} title="View" aria-label="View" className="admin-icon-btn">
          <Eye className="w-4 h-4" />
        </Link>
      ),
    },
  ];

  return (
    <PageShell
      title="Orders"
      subtitle="Manage and track customer orders"
      breadcrumbs={[{ label: 'Orders' }]}
      actions={
        <button onClick={exportCsv} className="admin-btn-secondary h-10 px-4 text-sm flex items-center gap-1.5">
          <Download className="w-4 h-4" />
          Export
        </button>
      }
    >
      <DataTable
        columns={columns}
        rows={filteredOrders}
        rowKey={(order) => order._id}
        loading={loading}
        searchable
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search orders..."
        filters={
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="admin-input !w-auto h-10 text-sm"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="packed">Packed</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
            <option value="returned">Returned</option>
          </select>
        }
        pagination={{ page, pages: totalPages, total, onPageChange: setPage }}
        emptyTitle="No orders found"
        emptyBody="Try adjusting your search or filters."
      />
    </PageShell>
  );
}
