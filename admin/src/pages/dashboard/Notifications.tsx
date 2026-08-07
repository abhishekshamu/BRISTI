import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, Trash2, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import api, { getApiError } from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import PageSpinner from '../../components/ui/PageSpinner';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  relatedId?: string;
  relatedType?: string;
  createdAt: string;
}

const PAGE_SIZE = 10;

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.data || []);
      setVisibleCount(PAGE_SIZE);
    } catch (error) {
      toast.error(getApiError(error, 'Failed to fetch notifications'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/read/${id}`);
      fetchNotifications();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to mark as read'));
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      toast.success('All notifications marked as read');
      fetchNotifications();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to mark all as read'));
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await api.delete(`/notifications/${id}`);
      fetchNotifications();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to delete notification'));
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20';
      case 'warning': return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20';
      case 'error': return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20';
      default: return 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const filteredNotifications = filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications;
  const visibleNotifications = filteredNotifications.slice(0, visibleCount);

  const changeFilter = (value: 'all' | 'unread') => {
    setFilter(value);
    setVisibleCount(PAGE_SIZE);
  };

  return (
    <PageShell
      title="Notifications"
      subtitle={unreadCount > 0 ? `You have ${unreadCount} unread notifications` : 'All caught up!'}
      actions={
        <>
          <select
            value={filter}
            onChange={(e) => changeFilter(e.target.value as any)}
            className="admin-input"
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread Only</option>
          </select>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="admin-btn-secondary py-2.5 px-4 flex items-center"
            >
              <Check className="w-4 h-4 mr-2" />
              Mark All Read
            </button>
          )}
        </>
      }
    >
      {/* Notifications list */}
      <div className="admin-card overflow-hidden">
        {loading ? (
          <PageSpinner label="Loading notifications…" />
        ) : (
          <>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {visibleNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                >
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-full ${getColor(notification.type)} border`}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {notification.title}
                        </p>
                        <div className="flex items-center space-x-2">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification._id)}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
                            >
                              <Check className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification._id)}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {visibleNotifications.length === 0 && (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 dark:text-slate-400">No notifications yet</p>
                </div>
              )}
            </div>
            {filteredNotifications.length > visibleCount && (
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="w-full py-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
