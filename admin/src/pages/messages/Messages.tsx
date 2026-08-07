import { useState, useEffect, useCallback } from 'react';
import { Mail, Trash2, Check, Reply, Archive } from 'lucide-react';
import api, { getApiError } from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import Toolbar from '../../components/ui/Toolbar';
import Badge, { type BadgeTone } from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import PageSpinner from '../../components/ui/PageSpinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

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

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pending', tone: 'amber' },
  read: { label: 'Read', tone: 'blue' },
  responded: { label: 'Responded', tone: 'green' },
  archived: { label: 'Archived', tone: 'slate' },
};

export default function Messages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({ total: 0, pending: 0, read: 0, responded: 0, archived: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await api.get(`/contact${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`);
      setMessages(response.data.data || []);
    } catch (error) {
      toast.error(getApiError(error, 'Failed to fetch messages'));
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

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await api.delete(`/contact/${deleteTarget._id}`);
      toast.success('Message deleted');
      setDeleteTarget(null);
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
    <PageShell
      title="Messages"
      subtitle="Contact form submissions"
      actions={
        <div className="flex items-center gap-2 flex-wrap text-sm">
          {['pending', 'read', 'responded', 'archived'].map((status) => (
            <Badge key={status} tone={STATUS_META[status].tone}>
              {status}: {stats[status] ?? 0}
            </Badge>
          ))}
        </div>
      }
    >
      <Toolbar
        searchable
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search messages..."
        filters={
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
        }
      />

      <div className="admin-card overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : filteredMessages.length === 0 ? (
          <EmptyState
            title="No messages found"
            body="Messages from the contact form will appear here."
            icon={<Mail className="w-6 h-6" />}
          />
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
                              <Badge tone={meta.tone}>{meta.label}</Badge>
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

                  <div className="flex items-center gap-2 mt-4 ml-8">
                    {message.status !== 'read' && (
                      <button
                        onClick={() => handleSetStatus(message._id, 'read')}
                        className="admin-btn-secondary h-8 px-3 text-xs flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Mark read
                      </button>
                    )}
                    {message.status !== 'responded' && (
                      <button
                        onClick={() => handleSetStatus(message._id, 'responded')}
                        className="admin-btn-secondary h-8 px-3 text-xs flex items-center gap-1.5"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        Mark responded
                      </button>
                    )}
                    {message.status !== 'archived' && (
                      <button
                        onClick={() => handleSetStatus(message._id, 'archived')}
                        className="admin-btn-ghost h-8 px-3 text-xs flex items-center gap-1.5"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        Archive
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(message)}
                      className="admin-btn-danger h-8 px-3 text-xs flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete message"
        body={`Are you sure you want to delete the message from "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  );
}
