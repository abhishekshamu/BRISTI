import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import DataTable, { type Column } from '../../components/ui/DataTable';
import IconBtn from '../../components/ui/IconBtn';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface Page {
  _id: string;
  title: string;
  slug: string;
  excerpt?: string;
  status: 'draft' | 'published' | 'archived';
  isInMenu: boolean;
  menuOrder: number;
  createdAt: string;
}

const getStatusTone = (status: string) =>
  status === 'published' ? 'green' : status === 'draft' ? 'amber' : 'slate';

export default function Pages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<Page | null>(null);

  const fetchPages = useCallback(async () => {
    try {
      const response = await api.get(`/pages?status=${statusFilter}`);
      setPages(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch pages');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await api.delete(`/pages/${deleteTarget._id}`);
      toast.success('Page deleted successfully');
      setDeleteTarget(null);
      fetchPages();
    } catch (error) {
      toast.error('Failed to delete page');
    }
  };

  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: Column<Page>[] = [
    {
      key: 'title',
      header: 'Title',
      sortKey: 'title',
      render: (page) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center">
            <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{page.title}</p>
            {page.excerpt && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                {page.excerpt}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'slug',
      header: 'Slug',
      sortKey: 'slug',
      render: (page) => (
        <span className="text-sm text-slate-600 dark:text-slate-400 font-mono">/{page.slug}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'status',
      render: (page) => <Badge tone={getStatusTone(page.status)}>{page.status}</Badge>,
    },
    {
      key: 'isInMenu',
      header: 'In Menu',
      render: (page) => (
        <Badge tone={page.isInMenu ? 'green' : 'slate'}>{page.isInMenu ? 'Yes' : 'No'}</Badge>
      ),
    },
    {
      key: 'menuOrder',
      header: 'Menu Order',
      sortKey: 'menuOrder',
      render: (page) => <span className="text-sm text-slate-600 dark:text-slate-400">{page.menuOrder}</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortKey: 'createdAt',
      render: (page) => (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {new Date(page.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (page) => (
        <div className="flex items-center space-x-1">
          <Link to={`/pages/${page._id}/edit`} className="admin-icon-btn" title="Edit">
            <Edit className="w-4 h-4" />
          </Link>
          <IconBtn title="Delete" onClick={() => setDeleteTarget(page)}>
            <Trash2 className="w-4 h-4 text-red-600" />
          </IconBtn>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Pages"
      subtitle="Create and manage CMS pages"
      actions={
        <Link to="/pages/create" className="admin-btn-primary h-10 px-4 text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          Add Page
        </Link>
      }
    >
      <DataTable
        columns={columns}
        rows={filteredPages}
        rowKey={(page) => page._id}
        loading={loading}
        searchable
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search pages..."
        filters={
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-input"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        }
        clientPagination
        pageSize={10}
        emptyTitle="No pages found"
        emptyBody="Create your first page to get started."
        emptyAction={
          <Link to="/pages/create" className="admin-btn-primary h-10 px-4 text-sm inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Create your first page
          </Link>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete page"
        body={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  );
}
