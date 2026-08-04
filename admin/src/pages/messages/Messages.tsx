import { useState, useEffect, useCallback } from 'react';
import { Mail, Search, Trash2, Check, Reply, Archive, Inbox } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'pending' | 'read' | 'responded' | 'archived';
  createdAt: string;
}

const STATUS_META: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Pending', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  read: { label: 'Read', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  responded: { label: 'Responded', classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  archived: { label: 'Archived', classes: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
};

export default function Messages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({ total: 0, pending: 0, read: 0, responded: 0, archived: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await api.get(`/contact${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`);
      setMessages(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    api.get('/contact/stats')
      .then((response) => setStats(response.data.data || {}))
      .catch(() => {});
  }, [messages]);

  const handleSetStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/contact/${id}/status`, { status });
      toast.success('Message updated');
      fetchMessages();
    } catch (error) {
      toast.error('Failed to update message');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      await api.delete(`/contact/${id}`);
      toast.success('Message deleted');
      fetchMessages();
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const filteredMessages = messages.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statusTabs = ['all', 'pending', 'read', 'responded', 'archived'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Messages</h2>
          <p className="text-slate-500 dark:text-slate-400">Contact form submissions</p>
        </div>
        <div className="flex items-center space-x-3 text-sm">
          {['pending', 'read', 'responded', 'archived'].map((status) => (
            <div key={status} className="flex items-center space-x-1.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${STATUS_META[status].classes.split(' ')[0]}`}></span>
              <span className="text-slate-600 dark:text-slate-400 capitalize">{status}: {stats[status] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-input"
          >
            {statusTabs.map((status) => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredMessages.map((message) => {
              const meta = STATUS_META[message.status];
              const isExpanded = expandedId === message._id;
              return (
                <div key={message._id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : message._id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <Mail className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                {message.subject}
                              </h3>
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${meta.classes}`}>
                                {meta.label}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                              {message.name} &lt;{message.email}&gt;
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 line-clamp-1">
                          {message.message}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500 ml-4 flex-shrink-0">
                        {new Date(message.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="mt-4 ml-8 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                      <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                        {message.message}
                      </div>
                      {message.phone && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Phone: {message.phone}</p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center space-x-2 mt-4 ml-8">
                    {message.status !== 'read' && (
                      <button
                        onClick={() => handleSetStatus(message._id, 'read')}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <Check className="w-3.5 h-3.5 mr-1.5" />
                        Mark read
                      </button>
                    )}
                    {message.status !== 'responded' && (
                      <button
                        onClick={() => handleSetStatus(message._id, 'responded')}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50"
                      >
                        <Reply className="w-3.5 h-3.5 mr-1.5" />
                        Mark responded
                      </button>
                    )}
                    {message.status !== 'archived' && (
                      <button
                        onClick={() => handleSetStatus(message._id, 'archived')}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <Archive className="w-3.5 h-3.5 mr-1.5" />
                        Archive
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(message._id)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md hover:bg-red-100 dark:hover:bg-red-900/40"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredMessages.length === 0 && (
              <div className="text-center py-12">
                <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No messages found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
