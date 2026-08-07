import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Ticket, Percent, TrendingUp } from 'lucide-react';
import PageShell from '../../components/ui/PageShell';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import IconBtn from '../../components/ui/IconBtn';
import StatCard from '../../components/ui/StatCard';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import api, { getApiError } from '../../lib/api';
import toast from 'react-hot-toast';

interface Coupon {
  _id: string;
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'bogo';
  value: number;
  minimumPurchase?: number;
  maximumDiscount?: number;
  usageLimit: number;
  usageCount: number;
  isActive: boolean;
  startsAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export default function Coupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleting, setDeleting] = useState<Coupon | null>(null);

  const fetchCoupons = useCallback(async () => {
    try {
      const response = await api.get(`/coupons${statusFilter !== 'all' ? `?isActive=${statusFilter === 'active'}` : ''}`);
      setCoupons(response.data.data || []);
    } catch (error) {
      toast.error(getApiError(error, 'Failed to fetch coupons'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleDelete = async () => {
    if (!deleting) return;

    try {
      await api.delete(`/coupons/${deleting._id}`);
      toast.success('Coupon deleted successfully');
      setDeleting(null);
      fetchCoupons();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to delete coupon'));
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage': return 'Percentage';
      case 'fixed_amount': return 'Fixed Amount';
      case 'free_shipping': return 'Free Shipping';
      case 'bogo': return 'Buy One Get One';
      default: return type;
    }
  };

  const filteredCoupons = coupons.filter(coupon =>
    coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    coupon.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: Column<Coupon>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (coupon) => (
        <code className="text-sm font-mono font-medium text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
          {coupon.code}
        </code>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (coupon) => <span className="font-medium text-slate-900 dark:text-slate-100">{coupon.name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (coupon) => <span className="text-slate-600 dark:text-slate-400">{getTypeLabel(coupon.type)}</span>,
    },
    {
      key: 'value',
      header: 'Value',
      render: (coupon) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value}`}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (coupon) => <span className="text-slate-600 dark:text-slate-400">{coupon.usageCount} / {coupon.usageLimit}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (coupon) => <Badge tone={coupon.isActive ? 'green' : 'slate'}>{coupon.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (coupon) => (
        <div className="flex items-center gap-1">
          <Link to={`/coupons/${coupon._id}/edit`} title="Edit" aria-label="Edit" className="admin-icon-btn">
            <Pencil className="w-4 h-4" />
          </Link>
          <IconBtn title="Delete" onClick={() => setDeleting(coupon)} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 className="w-4 h-4" />
          </IconBtn>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Coupons"
      subtitle="Create and manage discount coupons"
      breadcrumbs={[{ label: 'Coupons' }]}
      actions={
        <Link to="/coupons/create" className="admin-btn-primary h-10 px-4 text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          Add Coupon
        </Link>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Total Coupons"
          value={coupons.length}
          icon={<Ticket className="w-6 h-6" />}
          iconClass="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
        />
        <StatCard
          label="Active Coupons"
          value={coupons.filter(c => c.isActive).length}
          icon={<Percent className="w-6 h-6" />}
          iconClass="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
        />
        <StatCard
          label="Total Usage"
          value={coupons.reduce((sum, c) => sum + c.usageCount, 0)}
          icon={<TrendingUp className="w-6 h-6" />}
          iconClass="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
        />
      </div>

      <DataTable
        columns={columns}
        rows={filteredCoupons}
        rowKey={(coupon) => coupon._id}
        loading={loading}
        searchable
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search coupons..."
        filters={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-input !w-auto h-10 text-sm"
          >
            <option value="all">All Coupons</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        }
        clientPagination
        pageSize={10}
        emptyTitle="No coupons found"
        emptyBody="Try adjusting your search or filters, or create a new coupon."
        emptyAction={
          <Link to="/coupons/create" className="admin-btn-primary h-9 px-4 text-sm inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Add Coupon
          </Link>
        }
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete coupon"
        body={`Are you sure you want to delete coupon "${deleting?.code}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </PageShell>
  );
}
