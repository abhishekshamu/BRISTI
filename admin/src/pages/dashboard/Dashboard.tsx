import { useState, useEffect } from 'react';
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import api from '../../lib/api';
import toast from 'react-hot-toast';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardStats {
  userCount: number;
  productCount: number;
  orderCount: number;
  salesStats: {
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    totalCustomers: number;
  };
  userStats: {
    total: number;
    newThisMonth: number;
    active: number;
  };
  recentOrders: any[];
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, change, icon, color }: StatCardProps) {
  const isPositive = change && change > 0;

  return (
    <div className="admin-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
              {Math.abs(change)}% from last month
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [analyticsStats, setAnalyticsStats] = useState<any>(null);

  useEffect(() => {
    fetchDashboardStats();
    fetchAnalyticsStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/admin/dashboard/stats');
      setStats(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalyticsStats = async () => {
    try {
      const response = await api.get('/analytics/stats');
      setAnalyticsStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics stats');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const salesChartData = analyticsStats?.eventsByDay ? {
    labels: analyticsStats.eventsByDay.map((e: any) => e._id?.date || e._id || ''),
    datasets: [
      {
        label: 'Events',
        data: analyticsStats.eventsByDay.map((e: any) => e.count || 0),
        borderColor: 'rgb(15, 23, 42)',
        backgroundColor: 'rgba(15, 23, 42, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  } : {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Sales',
        data: [12000, 19000, 3000, 5000, 2000, 3000, 45000, 32000, 28000, 35000, 40000, 38000],
        borderColor: 'rgb(15, 23, 42)',
        backgroundColor: 'rgba(15, 23, 42, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const categoryData = {
    labels: ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books'],
    datasets: [
      {
        data: [35, 25, 20, 12, 8],
        backgroundColor: [
          'rgba(15, 23, 42, 0.9)',
          'rgba(100, 116, 139, 0.8)',
          'rgba(148, 163, 184, 0.7)',
          'rgba(203, 213, 225, 0.6)',
          'rgba(226, 232, 240, 0.5)',
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={`$${stats?.salesStats?.totalSales?.toLocaleString() || 0}`}
          change={12.5}
          icon={<DollarSign className="w-6 h-6 text-white" />}
          color="bg-slate-900 dark:bg-slate-50"
        />
        <StatCard
          title="Total Orders"
          value={stats?.salesStats?.totalOrders || 0}
          change={8.2}
          icon={<ShoppingCart className="w-6 h-6 text-white" />}
          color="bg-slate-700"
        />
        <StatCard
          title="Total Customers"
          value={stats?.userStats?.total || 0}
          change={-2.4}
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-slate-600"
        />
        <StatCard
          title="Products"
          value={stats?.productCount || 0}
          change={5.1}
          icon={<Package className="w-6 h-6 text-white" />}
          color="bg-slate-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales chart */}
        <div className="lg:col-span-2 admin-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Revenue Overview</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Monthly revenue for current year</p>
            </div>
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
              <MoreHorizontal className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          <div className="h-80">
            <Line data={salesChartData} options={chartOptions} />
          </div>
        </div>

        {/* Category distribution */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">Sales by Category</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Product category distribution</p>
          <div className="h-64 flex items-center justify-center">
            <Doughnut
              data={categoryData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      usePointStyle: true,
                      padding: 20,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="admin-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Orders</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Latest orders from your store</p>
          </div>
          <button className="admin-btn-secondary py-2 px-4">
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Order ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentOrders?.slice(0, 5).map((order: any) => (
                <tr key={order._id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                    #{order.orderNumber}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                    {order.guestEmail || order.userId}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                    ${order.total?.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      order.status === 'processing' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}