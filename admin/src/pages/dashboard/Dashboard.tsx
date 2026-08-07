import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingCart, Users, Package, Plus, Image, FileText, ArrowRight, Sparkles, Eye, Clock, Ticket, FolderTree, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import PageSpinner from '../../components/ui/PageSpinner';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { getApiError } from '../../lib/api';
import { usePageTitle } from '../../hooks/usePageTitle';

interface DashboardStats {
  userCount: number;
  productCount: number;
  orderCount: number;
  salesStats: Array<{
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
  }>;
  userStats: Array<{
    _id: string;
    count: number;
  }>;
  recentOrders: any[];
}

interface SalePoint {
  day: string;
  totalSales: number;
  orderCount: number;
}

interface AuthStats {
  activeSessions: number;
  recentLogins: Array<{
    _id: string;
    userId?: string;
    method: 'email' | 'google' | 'phone' | 'refresh';
    success: boolean;
    ip?: string;
    userAgent?: string;
    identifier?: string;
    failedReason?: string;
    createdAt: string;
  }>;
  recentFailedLogins: Array<{
    _id: string;
    userId?: string;
    method: 'email' | 'google' | 'phone' | 'refresh';
    success: boolean;
    ip?: string;
    userAgent?: string;
    identifier?: string;
    failedReason?: string;
    createdAt: string;
  }>;
  loginsLast7Days: number;
  failedLoginsLast7Days: number;
  googleLogins: number;
  phoneLogins: number;
  emailLogins: number;
}

const PIE_COLORS = ['#0f172a', '#64748b', '#94a3b8', '#cbd5e1', '#475569', '#1e293b', '#718096', '#334155', '#64748b', '#94a3b8', '#cbd5e1', '#475569', '#1e293b', '#718096', '#334155', '#64748b', '#94a3b8', '#cbd5e1', '#475569', '#1e293b'];

function statusTone(status: string): 'green' | 'amber' | 'blue' | 'slate' {
  if (status === 'delivered') return 'green';
  if (status === 'processing') return 'blue';
  if (status === 'pending') return 'amber';
  return 'slate';
}

function paymentTone(status: string): 'green' | 'amber' | 'red' | 'slate' {
  if (status === 'paid' || status === 'completed') return 'green';
  if (status === 'pending' || status === 'refunded') return 'amber';
  if (status === 'failed') return 'red';
  return 'slate';
}

function activityIcon(type: string) {
  if (type === 'Order' || type === 'order') return ShoppingCart;
  if (type === 'Product' || type === 'product') return Package;
  if (type === 'Category' || type === 'category') return FolderTree;
  if (type === 'User' || type === 'user' || type === 'Customer' || type === 'customer') return Users;
  if (type === 'Coupon' || type === 'coupon') return Ticket;
  return FileText;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function growthPercent(current: number, previous: number): { value: string; positive: boolean } | null {
  if (!previous || previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  return { value: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export default function Dashboard() {
  usePageTitle('Dashboard');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [daily, setDaily] = useState<SalePoint[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [authStats, setAuthStats] = useState<AuthStats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, salesRes, catRes, notifRes, authRes] = await Promise.all([
          api.get('/admin/dashboard/stats'),
          api.get('/orders/sales-stats?days=30'),
          api.get('/categories?limit=100'),
          api.get('/notifications?limit=20').catch(() => ({ data: { data: [] } })),
          api.get('/admin/auth-stats').catch(() => null),
        ]);
        setStats(statsRes.data.data);
        setDaily((salesRes.data.data?.daily ?? []).map((d: any) => ({ day: d._id.date, totalSales: d.totalSales, orderCount: d.orderCount })));
        setCategories(catRes.data.data ?? []);
        setNotifications(notifRes.data?.data ?? []);
        if (authRes?.data?.data) setAuthStats(authRes.data.data);
        setLastUpdated(new Date());
      } catch (error) {
        toast.error(getApiError(error, 'Failed to load dashboard'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <PageSpinner label="Loading dashboard…" />;

  const sales = stats?.salesStats?.[0];
  const customers = stats?.userStats?.find((u: any) => u._id === 'customer')?.count ?? 0;

  const catData = categories
    .map((c: any) => ({ name: c.name ?? 'Uncategorized', value: c.productCount ?? c.count ?? 0 }))
    .filter((c: any) => c.value > 0)
    .sort((a: any, b: any) => b.value - a.value);

  const totalProducts = catData.reduce((sum: number, c: any) => sum + c.value, 0);
  const totalCategories = catData.length;

  const today = new Date().toISOString().slice(0, 10);
  const todaySales = daily.find((d: SalePoint) => d.day === today)?.totalSales ?? 0;
  const todayOrders = daily.find((d: SalePoint) => d.day === today)?.orderCount ?? 0;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekEnd = new Date();
  const thisWeekSales = daily
    .filter((d: SalePoint) => new Date(d.day) >= weekStart && new Date(d.day) <= weekEnd)
    .reduce((sum: number, d: SalePoint) => sum + d.totalSales, 0);
  const prevWeekSales = daily
    .filter((d: SalePoint) => {
      const date = new Date(d.day);
      return date >= new Date(weekStart.getTime() - 7 * 86400000) && date < weekStart;
    })
    .reduce((sum: number, d: SalePoint) => sum + d.totalSales, 0);
  const salesGrowth = growthPercent(thisWeekSales, prevWeekSales);

  const weekOrders = daily
    .filter((d: SalePoint) => new Date(d.day) >= weekStart && new Date(d.day) <= weekEnd)
    .reduce((sum: number, d: SalePoint) => sum + d.orderCount, 0);
  const prevWeekOrders = daily
    .filter((d: SalePoint) => {
      const date = new Date(d.day);
      return date >= new Date(weekStart.getTime() - 7 * 86400000) && date < weekStart;
    })
    .reduce((sum: number, d: SalePoint) => sum + d.orderCount, 0);
  const ordersGrowth = growthPercent(weekOrders, prevWeekOrders);

  const aov = sales?.averageOrderValue ?? 0;

  const sparklineRevenue = daily.slice(-7).map((d: SalePoint) => d.totalSales);
  const sparklineOrders = daily.slice(-7).map((d: SalePoint) => d.orderCount);

  const quickActions = [
    { label: 'New product', to: '/products/create', icon: Package },
    { label: 'New blog post', to: '/blogs/create', icon: FileText },
    { label: 'Upload media', to: '/media', icon: Image },
    { label: 'New page', to: '/pages/create', icon: FileText },
  ];

  return (
    <div className="admin-page">
      {/* Premium header */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="admin-page-title">Dashboard</h1>
            <p className="admin-page-subtitle">Overview of your store performance</p>
            {lastUpdated && (
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Last updated {timeAgo(lastUpdated.toISOString())}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link to="/products/create" className="admin-btn-primary h-9 px-4 text-xs flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Quick Create
            </Link>
          </div>
        </div>
      </motion.div>

      {/* KPI cards */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.05 }} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard
          label="Revenue"
          value={`$${(sales?.totalSales ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          todayValue={todaySales > 0 ? `$${todaySales.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—'}
          icon={<DollarSign className="w-5 h-5" />}
          iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          delta={salesGrowth ?? undefined}
          sparkline={sparklineRevenue}
          to="/analytics"
        />
        <StatCard
          label="Orders"
          value={(sales?.totalOrders ?? stats?.orderCount ?? 0).toLocaleString()}
          todayValue={todayOrders > 0 ? `${todayOrders} orders` : '—'}
          icon={<ShoppingCart className="w-5 h-5" />}
          iconClass="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
          delta={ordersGrowth ?? undefined}
          sparkline={sparklineOrders}
          to="/orders"
        />
        <StatCard
          label="Customers"
          value={customers.toLocaleString()}
          icon={<Users className="w-5 h-5" />}
          iconClass="bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
          to="/customers"
        />
        <StatCard
          label="Products"
          value={(stats?.productCount ?? 0).toLocaleString()}
          icon={<Package className="w-5 h-5" />}
          iconClass="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          to="/products"
        />
        <StatCard
          label="AOV"
          value={`$${aov.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          icon={<Sparkles className="w-5 h-5" />}
          iconClass="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        />
      </motion.div>

      {/* Authentication overview */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.08 }} className="admin-card mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <h3 className="admin-section-title">Authentication</h3>
          </div>
          <span className="text-xs text-slate-400">Last 7 days</span>
        </div>

        {!authStats ? (
          <div className="flex items-center justify-center h-24 text-sm text-slate-400">Auth stats unavailable</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 divide-x divide-y md:divide-y-0 divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800">
              <div className="px-6 py-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Active Sessions</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">{authStats.activeSessions}</p>
              </div>
              <div className="px-6 py-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Successful Logins</p>
                <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">{authStats.loginsLast7Days}</p>
              </div>
              <div className="px-6 py-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Failed Attempts</p>
                <p className="text-2xl font-semibold text-rose-500 mt-1 tabular-nums">{authStats.failedLoginsLast7Days}</p>
              </div>
              <div className="px-6 py-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Email</p>
                <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">{authStats.emailLogins}</p>
              </div>
              <div className="px-6 py-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Google</p>
                <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">{authStats.googleLogins}</p>
              </div>
              <div className="px-6 py-4">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Phone OTP</p>
                <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">{authStats.phoneLogins}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="admin-th">Status</th>
                    <th className="admin-th">Method</th>
                    <th className="admin-th">Identifier</th>
                    <th className="admin-th">IP Address</th>
                    <th className="admin-th">Reason</th>
                    <th className="admin-th">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[...authStats.recentLogins, ...authStats.recentFailedLogins]
                    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 10)
                    .map((entry: any) => (
                      <tr key={entry._id} className="admin-tr">
                        <td className="admin-td">
                          <Badge tone={entry.success ? 'green' : 'red'}>
                            {entry.success ? 'Success' : 'Failed'}
                          </Badge>
                        </td>
                        <td className="admin-td capitalize">{entry.method}</td>
                        <td className="admin-td text-slate-600 dark:text-slate-300 truncate max-w-[180px]">{entry.identifier ?? '—'}</td>
                        <td className="admin-td text-xs text-slate-400">{entry.ip ?? '—'}</td>
                        <td className="admin-td text-xs text-slate-400">{entry.failedReason ?? '—'}</td>
                        <td className="admin-td text-xs text-slate-400 whitespace-nowrap">{timeAgo(entry.createdAt)}</td>
                      </tr>
                    ))}
                  {authStats.recentLogins.length + authStats.recentFailedLogins.length === 0 && (
                    <tr>
                      <td className="admin-td text-center text-slate-400 py-8" colSpan={6}>
                        <ShieldAlert className="w-4 h-4 inline mr-1.5 opacity-60" /> No login activity yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </motion.div>

      {/* Charts row */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="admin-card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="admin-section-title">Revenue Overview</h3>
              <p className="text-xs text-slate-400 mt-0.5">Daily revenue for the last 30 days</p>
            </div>
            <Link to="/analytics" className="admin-btn-ghost h-8 px-3 text-xs flex items-center gap-1">
              Analytics <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {daily.length === 0 ? (
            <div className="flex items-center justify-center h-72 text-sm text-slate-400">No sales data available yet</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0f172a" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#0f172a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: string) => v.slice(5).replace('-', '/')}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
                  />
                  <ChartTooltip
                    contentStyle={{
                      background: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                      color: 'hsl(var(--popover-foreground))',
                    }}
                    formatter={(value: any) => [`$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Revenue']}
                    labelFormatter={(label: any) => new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  />
                  <Area type="monotone" dataKey="totalSales" stroke="#0f172a" strokeWidth={2} fill="url(#revenueFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="admin-card overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex items-center justify-between mb-1">
              <h3 className="admin-section-title">Products by Category</h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">{totalProducts} products in {totalCategories} categories</p>
          </div>
          {catData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-sm text-slate-400">No category data yet</div>
          ) : (
            <div className="flex flex-col sm:flex-row">
              <div className="sm:w-1/2 p-4 flex items-center justify-center" style={{ minHeight: 220 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={catData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2} strokeWidth={0}>
                      {catData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      contentStyle={{
                        background: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'hsl(var(--popover-foreground))',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="sm:w-1/2 max-h-52 overflow-y-auto p-4 pt-2 space-y-1">
                {catData.map((c: any, i: number) => (
                  <Link
                    key={c.name}
                    to={`/categories`}
                    className="flex items-center gap-2 text-xs py-1 px-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group"
                    title={c.name}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-slate-600 dark:text-slate-300 truncate flex-1 group-hover:text-slate-900 dark:group-hover:text-slate-100">{c.name}</span>
                    <span className="text-slate-400 tabular-nums shrink-0">{c.value}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Recent orders + activity */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.15 }} className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="admin-card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="admin-section-title">Recent Orders</h3>
            <Link to="/orders" className="admin-btn-ghost h-8 px-3 text-xs flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {stats?.recentOrders?.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">No orders yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="admin-th">Order</th>
                    <th className="admin-th">Customer</th>
                    <th className="admin-th">Payment</th>
                    <th className="admin-th">Amount</th>
                    <th className="admin-th">Status</th>
                    <th className="admin-th">Date</th>
                    <th className="admin-th"></th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.recentOrders?.slice(0, 6).map((order: any) => {
                    const email = order.guestEmail || (order.userId ? String(order.userId).slice(0, 8) : '—');
                    const initials = email === '—' ? '—' : email.slice(0, 2).toUpperCase();
                    return (
                      <tr key={order._id} className="admin-tr group">
                        <td className="admin-td">
                          <Link to={`/orders/${order._id}`} className="font-medium text-slate-900 dark:text-slate-100 hover:underline">
                            #{order.orderNumber}
                          </Link>
                        </td>
                        <td className="admin-td">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                              {initials}
                            </div>
                            <span className="text-slate-600 dark:text-slate-300 truncate">{email}</span>
                          </div>
                        </td>
                        <td className="admin-td">
                          <Badge tone={paymentTone(order.paymentStatus)}>{order.paymentStatus ?? '—'}</Badge>
                        </td>
                        <td className="admin-td tabular-nums font-medium">${order.totalAmount ?? 0}</td>
                        <td className="admin-td">
                          <Badge tone={statusTone(order.status)}>{order.status}</Badge>
                        </td>
                        <td className="admin-td text-slate-400 text-xs">{new Date(order.createdAt).toLocaleDateString()}</td>
                        <td className="admin-td">
                          <Link to={`/orders/${order._id}`} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 opacity-0 group-hover:opacity-100 transition-opacity" title="View order">
                            <Eye className="w-3 h-3" /> View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="admin-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="admin-section-title">Recent Activity</h3>
              <Link to="/notifications" className="admin-btn-ghost h-8 px-3 text-xs">All</Link>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No activity yet</p>
            ) : (
              <ul className="space-y-3">
                {notifications.slice(0, 8).map((n: any) => {
                  const Icon = activityIcon(n.relatedType || n.type);
                  return (
                    <li key={n._id} className="flex gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-700 dark:text-slate-200 truncate">{n.title}</p>
                        <p className="text-xs text-slate-400 truncate">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="admin-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="admin-section-title">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="flex items-center gap-2.5 px-3 py-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors text-xs font-medium text-slate-700 dark:text-slate-200"
                >
                  <a.icon className="w-4 h-4 text-slate-400" />
                  {a.label}
                </Link>
              ))}
              <Link
                to="/products/create"
                className="flex items-center justify-center gap-1.5 col-span-2 px-3 py-2.5 rounded-lg admin-btn-primary text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> New product
              </Link>
            </div>
          </div>
        </div>
      </motion.div>

      <p className="text-center text-[11px] text-slate-400 mt-8">
        Average order value: <span className="font-medium text-slate-500 dark:text-slate-300">${aov.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
        {' · '}
        This month: <span className="font-medium text-slate-500 dark:text-slate-300">{(stats?.userCount ?? 0).toLocaleString()} users</span>
      </p>
    </div>
  );
}