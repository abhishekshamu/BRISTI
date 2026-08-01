import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users, Eye, UserCheck, UserX, X, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import api from '../../lib/api';
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

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  deleted: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
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
    } catch {
      toast.error('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(), searchQuery ? 350 : 0);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  const toggleStatus = async (customer: Customer) => {
    const next = customer.status === 'active' ? 'suspended' : 'active';
    try {
      await api.put(`/users/customers/${customer._id}/status`, { status: next });
      toast.success(`${fullName(customer)} ${next === 'active' ? 'activated' : 'suspended'}`);
      if (selected?._id === customer._id) setSelected({ ...customer, status: next });
      fetchCustomers();
    } catch {
      toast.error('Failed to update customer status');
    }
  };

  const fullName = (customer: Customer) => `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim() || customer.email;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Customers</h2>
          <p className="text-slate-500 dark:text-slate-400">View and manage customer accounts</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Users className="w-4 h-4" />
          {total} customers
        </div>
      </div>

      <div className="admin-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="admin-input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="admin-input"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Customer</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Verified</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Last login</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Joined</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer._id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200">
                            {(customer.firstName?.[0] ?? 'C').toUpperCase()}
                          </span>
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{fullName(customer)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{customer.email}</td>
                      <td className="py-3 px-4 text-sm">
                        <span className={customer.emailVerified ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}>
                          {customer.emailVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[customer.status] ?? STATUS_COLORS.deleted}`}>
                          {customer.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400">
                        {customer.lastLoginAt ? new Date(customer.lastLoginAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400">
                        {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelected(customer)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                            title="View details"
                          >
                            <Eye className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          </button>
                          {customer.status === 'active' ? (
                            <button
                              onClick={() => toggleStatus(customer)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                              title="Suspend customer"
                            >
                              <UserX className="w-4 h-4 text-red-500" />
                            </button>
                          ) : customer.status !== 'deleted' ? (
                            <button
                              onClick={() => toggleStatus(customer)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                              title="Reactivate customer"
                            >
                              <UserCheck className="w-4 h-4 text-green-500" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
                        No customers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
              <div className="text-sm text-slate-500 dark:text-slate-400">Showing {customers.length} of {total} customers</div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="admin-btn-secondary py-1.5 px-3 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-400">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="admin-btn-secondary py-1.5 px-3 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto admin-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700 text-lg font-medium text-slate-700 dark:text-slate-200">
                  {(selected.firstName?.[0] ?? 'C').toUpperCase()}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{fullName(selected)}</h3>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[selected.status] ?? STATUS_COLORS.deleted}`}>
                    {selected.status}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="mt-6 flex justify-end gap-3">
              {selected.status === 'active' ? (
                <button onClick={() => toggleStatus(selected)} className="admin-btn-danger py-2 px-4 flex items-center">
                  <UserX className="w-4 h-4 mr-2" /> Suspend account
                </button>
              ) : selected.status !== 'deleted' ? (
                <button onClick={() => toggleStatus(selected)} className="admin-btn-primary py-2 px-4 flex items-center">
                  <UserCheck className="w-4 h-4 mr-2" /> Reactivate
                </button>
              ) : null}
              <Link
                to={`/orders?customer=${selected._id}`}
                className="admin-btn-secondary py-2 px-4 flex items-center"
                onClick={() => setSelected(null)}
              >
                View orders
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
