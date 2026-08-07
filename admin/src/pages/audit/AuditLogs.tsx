import { useState, useEffect, useCallback } from 'react';
import { Download, FileText, User, Edit, Trash2, Eye, Plus } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Badge, { type BadgeTone } from '../../components/ui/Badge';

interface AuditLog {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  userEmail: string;
  changes?: any;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

const getActionTone = (action: string): BadgeTone =>
  action === 'create' ? 'green' : action === 'update' ? 'blue' : action === 'delete' ? 'red' : 'slate';

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (entityFilter !== 'all') params.set('entityType', entityFilter);
      const query = params.toString();
      const response = await api.get(`/audit${query ? `?${query}` : ''}`);
      setLogs(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <Plus className="w-4 h-4 text-green-600" />;
      case 'update': return <Edit className="w-4 h-4 text-blue-600" />;
      case 'delete': return <Trash2 className="w-4 h-4 text-red-600" />;
      case 'view': return <Eye className="w-4 h-4 text-slate-600" />;
      default: return <FileText className="w-4 h-4 text-slate-600" />;
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesEntity = entityFilter === 'all' || log.entityType === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  const entityTypes = Array.from(new Set(logs.map(l => l.entityType)));

  const handleExport = () => {
    const rows = [
      ['Timestamp', 'Action', 'Entity', 'Entity ID', 'User', 'Email', 'IP Address'],
      ...filteredLogs.map(log => [
        new Date(log.createdAt).toISOString(),
        log.action,
        log.entityType,
        log.entityId,
        log.userName,
        log.userEmail,
        log.ipAddress || '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'audit-logs.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Audit logs exported');
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortKey: 'timestamp',
      render: (log) => (
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {new Date(log.createdAt).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortKey: 'action',
      render: (log) => (
        <div className="flex items-center gap-2">
          {getActionIcon(log.action)}
          <Badge tone={getActionTone(log.action)}>{log.action}</Badge>
        </div>
      ),
    },
    {
      key: 'entityType',
      header: 'Entity',
      sortKey: 'entityType',
      render: (log) => (
        <span className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">{log.entityType}</span>
      ),
    },
    {
      key: 'entityId',
      header: 'Entity ID',
      sortKey: 'entityId',
      render: (log) => (
        <span className="text-sm font-mono text-slate-600 dark:text-slate-400">{log.entityId}</span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      sortKey: 'user',
      render: (log) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{log.userName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{log.userEmail}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      sortKey: 'ipAddress',
      render: (log) => (
        <span className="text-sm font-mono text-slate-600 dark:text-slate-400">{log.ipAddress || '-'}</span>
      ),
    },
  ];

  return (
    <PageShell
      title="Audit Logs"
      subtitle="Track all admin activities and changes"
      actions={
        <button
          onClick={handleExport}
          className="admin-btn-secondary h-10 px-4 text-sm flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      }
    >
      <DataTable
        columns={columns}
        rows={filteredLogs}
        rowKey={(log) => log._id}
        loading={loading}
        searchable
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search logs..."
        filters={
          <>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="admin-input"
            >
              <option value="all">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="view">View</option>
            </select>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="admin-input"
            >
              <option value="all">All Entities</option>
              {entityTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </>
        }
        clientPagination
        pageSize={20}
        emptyTitle="No audit logs found"
        emptyBody="Admin activity will appear here once actions are performed."
      />
    </PageShell>
  );
}
