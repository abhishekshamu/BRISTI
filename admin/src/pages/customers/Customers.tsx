import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, Eye, UserCheck, UserX, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import PageShell from '../../components/ui/PageShell';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Badge, { type BadgeTone } from '../../components/ui/Badge';
import IconBtn from '../../components/ui/IconBtn';
import Modal from '../../components/ui/Modal';
import api, { getApiError } from '../../lib/api';
import toast from 'react-hot-toast';

interface Customer {
  _id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  status: 'active' | 'suspended' | 'deleted';
  emailVerified?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  addresses?: Array<{ id: string; addressLine1?: string; city?: string; state?: string; postalCode?: string; country?: string; isDefault?: boolean }>;
}

interface CustomerResponse {
  data: Customer[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const STATUS_TONES: Record<string, BadgeTone> = {
  active: 'green',
  suspended: 'red',
  deleted: 'slate',
};

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const params: string[] = [`page=${page}`, 'limit=20'];
      if (searchQuery.trim()) params.push(`search=${encodeURIComponent(searchQuery.trim())}`);
      if (statusFilter !== 'all') params.push(`status=${statusFilter}`);
      const response = await api.get(`/users/customers?${params.join('&')}`);
      const result = response.data.data as CustomerResponse;
      setCustomers(result.data);
      setTotal(result.total);
      setTotalPages(result.pages || 1);
    } catch (error) {
      toast.error(getApiError(error, 'Failed to fetch customers'));
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(), searchQuery ? 350 : 0);
    return () => clearTimeout(timer);
  }, [fetchCustomers, searchQuery]);

  const toggleStatus = async (customer: Customer) => {
    const next = customer.status === 'active' ? 'suspended' : 'active';
    try {
      await api.put(`/users/customers/${customer._id}/status`, { status: next });
      toast.success(`${fullName(customer)} ${next === 'active' ? 'activated' : 'suspended'}`);
      if (selected?._id === customer._id) setSelected({ ...customer, status: next });
      fetchCustomers();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to update customer status'));
    }
  };

  const fullName = (customer: Customer) => `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email;

  const columns: Column<Customer>[] = [
    {
      key: 'customer',
      header: 'Customer',
      render: (customer) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 shrink-0">
            {(customer.firstName?.[0] ?? 'C').toUpperCase()}
          </span>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{fullName(customer)}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      render: (customer) => <span className="text-slate-600 dark:text-slate-400">{customer.email}</span>,
    },
    {
      key: 'verified',
      header: 'Verified',
      render: (customer) => (
        <span className={customer.emailVerified ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>
          {customer.emailVerified ? 'Verified' : 'Unverified'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (customer) => <Badge tone={STATUS_TONES[customer.status] ?? 'slate'}>{customer.status}</Badge>,
    },
    {
      key: 'lastLogin',
      header: 'Last login',
      render: (customer) => (
        <span className="text-slate-500 dark:text-slate-400">
          {customer.lastLoginAt ? new Date(customer.lastLoginAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (customer) => (
        <span className="text-slate-500 dark:text-slate-400">
          {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (customer) => (
        <div className="flex items-center gap-1">
          <IconBtn title="View details" onClick={() => setSelected(customer)}>
            <Eye className="w-4 h-4" />
          </IconBtn>
          {customer.status === 'active' ? (
            <IconBtn title="Suspend customer" onClick={() => toggleStatus(customer)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
              <UserX className="w-4 h-4" />
            </IconBtn>
          ) : customer.status !== 'deleted' ? (
            <IconBtn title="Reactivate customer" onClick={() => toggleStatus(customer)} className="text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20">
              <UserCheck className="w-4 h-4" />
            </IconBtn>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Customers"
      subtitle="View and manage customer accounts"
      breadcrumbs={[{ label: 'Customers' }]}
      actions={
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Users className="w-4 h-4" />
          {total} customers
        </div>
      }
    >
      <DataTable
        columns={columns}
        rows={customers}
        rowKey={(customer) => customer._id}
        loading={loading}
        searchable
        searchValue={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setPage(1);
        }}
        searchPlaceholder="Search by name or email..."
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
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
          </select>
        }
        pagination={{ page, pages: totalPages, total, onPageChange: setPage }}
        emptyTitle="No customers found"
        emptyBody="Try adjusting your search or filters."
      />

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? fullName(selected) : 'Customer details'}
        footer={
          selected && (
            <>
              {selected.status === 'active' ? (
                <button onClick={() => toggleStatus(selected)} className="admin-btn-danger h-9 px-4 text-sm flex items-center gap-1.5">
                  <UserX className="w-4 h-4" />
                  Suspend account
                </button>
              ) : selected.status !== 'deleted' ? (
                <button onClick={() => toggleStatus(selected)} className="admin-btn-primary h-9 px-4 text-sm flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  Reactivate
                </button>
              ) : null}
              <Link
                to={`/orders?customer=${selected._id}`}
                onClick={() => setSelected(null)}
                className="admin-btn-secondary h-9 px-4 text-sm flex items-center gap-1.5"
              >
                View orders
              </Link>
            </>
          )
        }
      >
        {selected && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-lg font-medium text-slate-700 dark:text-slate-200">
                {(selected.firstName?.[0] ?? 'C').toUpperCase()}
              </span>
              <Badge tone={STATUS_TONES[selected.status] ?? 'slate'}>{selected.status}</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <Mail className="w-4 h-4 shrink-0" /> {selected.email}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <Phone className="w-4 h-4 shrink-0" /> {selected.phone || '—'}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <Calendar className="w-4 h-4 shrink-0" /> Joined {selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : '—'}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                {selected.emailVerified ? 'Email verified' : 'Email not verified'}
              </div>
            </div>

            {selected.addresses && selected.addresses.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Addresses</h4>
                <div className="space-y-3">
                  {selected.addresses.map((address) => (
                    <div key={address.id} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p>
                          {[address.addressLine1, address.city, address.state, address.postalCode, address.country].filter(Boolean).join(', ')}
                        </p>
                        {address.isDefault && <span className="text-xs text-green-600 dark:text-green-400">Default</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </Modal>
    </PageShell>
  );
}
