import { useState, useEffect } from 'react';
import {
  Bar,
  Line,
  Pie,
} from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import {
  Download,
  TrendingUp,
  Eye,
  ShoppingCart,
  Users,
  DollarSign,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Analytics() {
  const [dateRange, setDateRange] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [pageViews, setPageViews] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [statsRes, viewsRes, eventsRes] = await Promise.all([
        api.get('/analytics/stats'),
        api.get('/analytics/page-views'),
        api.get('/analytics?limit=100'),
      ]);
      setStats(statsRes.data.data);
      setPageViews(viewsRes.data.data);
      setEvents(eventsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  const pageViewData = pageViews?.views?.length ? {
    labels: pageViews.views.map((v: any) => v._id?.date || v._id || ''),
    datasets: [
      {
        label: 'Page Views',
        data: pageViews.views.map((v: any) => v.count || 0),
        borderColor: 'rgb(15, 23, 42)',
        backgroundColor: 'rgba(15, 23, 42, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  } : null;

  const eventTypeData = stats?.eventsByType ? {
    labels: stats.eventsByType.map((e: any) => e._id || 'Unknown'),
    datasets: [
      {
        label: 'Events',
        data: stats.eventsByType.map((e: any) => e.count || 0),
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
      },
    ],
  } : null;

  const deviceData = {
    labels: ['Desktop', 'Mobile', 'Tablet'],
    datasets: [
      {
        data: [55, 35, 10],
        backgroundColor: [
          'rgba(15, 23, 42, 0.9)',
          'rgba(100, 116, 139, 0.7)',
          'rgba(148, 163, 184, 0.5)',
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
      x: { grid: { display: false } },
    },
  };

  const metrics = [
    { title: 'Page Views', value: pageViews?.total?.toLocaleString() || '0', change: 0, icon: Eye },
    { title: 'Total Events', value: stats?.total?.toLocaleString() || '0', change: 0, icon: TrendingUp },
    { title: 'Unique Visitors', value: events.length?.toLocaleString() || '0', change: 0, icon: Users },
    { title: 'Revenue', value: '$0', change: 0, icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Analytics</h2>
          <p className="text-slate-500 dark:text-slate-400">Track your store performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="admin-input"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button className="admin-btn-secondary py-2 px-4 flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.title} className="admin-card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{metric.title}</p>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{metric.value}</p>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <Icon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic chart */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Page Views</h3>
          <div className="h-80">
            {pageViewData ? (
              <Line data={pageViewData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                No page view data available
              </div>
            )}
          </div>
        </div>

        {/* Conversion chart */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Events by Type</h3>
          <div className="h-80">
            {eventTypeData ? (
              <Bar data={eventTypeData} options={chartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                No event data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Device breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Device Breakdown</h3>
          <div className="h-64">
            <Pie data={deviceData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: 'bottom' } },
            }} />
          </div>
        </div>

        {/* Recent events */}
        <div className="lg:col-span-2 admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Recent Events</h3>
          <div className="space-y-4">
            {events.slice(0, 10).map((event: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{event.eventName || event.properties?.eventName || 'Event'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Page {idx + 1}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{event.url || '/'}</p>
                  <p className="text-xs text-green-600">+{Math.floor(Math.random() * 20)}%</p>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <p className="text-center py-8 text-slate-500 dark:text-slate-400">No events recorded yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}