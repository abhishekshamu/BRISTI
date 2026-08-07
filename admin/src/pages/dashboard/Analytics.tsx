import { useState, useEffect, useCallback, useMemo } from 'react';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api, { getApiError } from '../../lib/api';
import PageSpinner from '../../components/ui/PageSpinner';
import StatCard from '../../components/ui/StatCard';
import { usePageTitle } from '../../hooks/usePageTitle';
import { Eye, Zap, Users, DollarSign } from 'lucide-react';

const RANGES: Record<string, { label: string; days: number }> = {
  '7d': { label: 'Last 7 days', days: 7 },
  '30d': { label: 'Last 30 days', days: 30 },
  '90d': { label: 'Last 90 days', days: 90 },
  '1y': { label: 'Last 12 months', days: 365 },
};

const PIE_COLORS = ['#0f172a', '#64748b', '#94a3b8', '#cbd5e1', '#475569', '#1e293b'];

function fmtDate(d: Date): string {
  return d.toISOString();
}

export default function Analytics() {
  usePageTitle('Analytics');
  const [range, setRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [pageViews, setPageViews] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<any[]>([]);

  const { startDate, endDate, days } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - RANGES[range].days);
    return { startDate: fmtDate(start), endDate: fmtDate(end), days: RANGES[range].days };
  }, [range]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { startDate, endDate };
      const [statsRes, viewsRes, eventsRes, salesRes] = await Promise.all([
        api.get('/analytics/stats', { params }),
        api.get('/analytics/page-views', { params }),
        api.get('/analytics', { params: { limit: 100 } }),
        api.get('/orders/sales-stats', { params: { days } }),
      ]);
      setStats(statsRes.data?.data ?? []);
      setPageViews(viewsRes.data?.data ?? []);
      setEvents(eventsRes.data?.data ?? []);
      setRevenue((salesRes.data?.data?.daily ?? []).reverse());
    } catch (error) {
      toast.error(getApiError(error, 'Failed to load analytics'));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, days]);

  useEffect(() => {
    void load();
  }, [load]);

  const uniqueUsers = useMemo(() => {
    const set = new Set<string>();
    for (const s of stats) {
      for (const id of s.uniqueUsers ?? []) set.add(String(id));
    }
    return set.size;
  }, [stats]);

  const totalViews = useMemo(() => pageViews.reduce((sum, v) => sum + (v.views ?? 0), 0), [pageViews]);

  const viewsByDay = useMemo(() => {
    const map = new Map<string, { day: string; views: number }>();
    for (const v of pageViews) {
      const day = v._id?.day;
      if (!day) continue;
      const key = `${day}`;
      map.set(key, { day, views: (map.get(key)?.views ?? 0) + (v.views ?? 0) });
    }
    return [...map.values()].sort((a, b) => (a.day < b.day ? -1 : 1));
  }, [pageViews]);

  const eventsByType = useMemo(() => stats.map((s) => ({ name: s._id, count: s.count ?? 0 })), [stats]);

  const deviceBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) {
      const type = e.deviceType || e.properties?.deviceType || 'Unknown';
      map.set(type, (map.get(type) ?? 0) + 1);
    }
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [events]);

  const totalRevenue = useMemo(
    () => revenue.reduce((sum, r) => sum + (r.totalSales ?? 0), 0),
    [revenue]
  );

  const exportCsv = () => {
    const rows = [
      ['Day', 'Page Views', 'Revenue'],
      ...viewsByDay.map((v) => [v.day, v.views, '$' + (revenue.find((r) => `${r._id?.day}` === v.day)?.totalSales ?? 0)]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Analytics exported');
  };

  if (loading) return <PageSpinner label="Loading analytics…" />;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Analytics</h1>
          <p className="admin-page-subtitle">{RANGES[range].label}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as any)}
            className="admin-input !w-auto h-10 text-sm"
            aria-label="Date range"
          >
            {Object.entries(RANGES).map(([key, r]) => (
              <option key={key} value={key}>{r.label}</option>
            ))}
          </select>
          <button type="button" onClick={exportCsv} className="admin-btn-secondary h-10 px-4 text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Page Views" value={totalViews.toLocaleString()} icon={<Eye className="w-5 h-5" />} iconClass="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" />
        <StatCard label="Total Events" value={eventsByType.reduce((s, e) => s + e.count, 0).toLocaleString()} icon={<Zap className="w-5 h-5" />} iconClass="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400" />
        <StatCard label="Unique Visitors" value={uniqueUsers.toLocaleString()} icon={<Users className="w-5 h-5" />} iconClass="bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400" />
        <StatCard label="Revenue" value={`$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`} icon={<DollarSign className="w-5 h-5" />} iconClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <div className="admin-card p-6">
          <h3 className="admin-section-title mb-4">Page Views</h3>
          {viewsByDay.length === 0 ? (
            <div className="flex items-center justify-center h-72 text-sm text-slate-400">No page view data yet</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={viewsByDay} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <ChartTooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }}
                  />
                  <Line type="monotone" dataKey="views" stroke="#0f172a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="admin-card p-6">
          <h3 className="admin-section-title mb-4">Events by Type</h3>
          {eventsByType.length === 0 ? (
            <div className="flex items-center justify-center h-72 text-sm text-slate-400">No event data yet</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventsByType} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <ChartTooltip
                    contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }}
                  />
                  <Bar dataKey="count" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={42} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="admin-card p-6">
          <h3 className="admin-section-title mb-4">Device Breakdown</h3>
          {deviceBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-60 text-sm text-slate-400">No device data yet</div>
          ) : (
            <div className="h-60 flex items-center">
              <div className="w-1/2 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={deviceBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={2} strokeWidth={0}>
                      {deviceBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--popover-foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-1.5">
                {deviceBreakdown.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-slate-600 dark:text-slate-300 truncate capitalize">{d.name}</span>
                    <span className="ml-auto text-slate-400 tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="admin-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <h3 className="admin-section-title">Recent Events</h3>
            <p className="text-xs text-slate-400 mt-0.5">Latest 100 tracked events</p>
          </div>
          {events.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">No events yet</div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
              {events.slice(0, 10).map((e) => (
                <li key={e._id} className="flex items-center gap-3 px-6 py-3 text-sm">
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 capitalize">
                    {e.eventName}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-slate-500 dark:text-slate-400">{e.url}</span>
                  <span className="text-[11px] text-slate-400 shrink-0">{new Date(e.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
