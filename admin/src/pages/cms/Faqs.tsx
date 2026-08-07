import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
import api, { getApiError } from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import DataTable, { type Column } from '../../components/ui/DataTable';
import IconBtn from '../../components/ui/IconBtn';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface FAQ {
  _id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function Faqs() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<FAQ | null>(null);

  const fetchFaqs = useCallback(async () => {
    try {
      const response = await api.get(`/faqs${categoryFilter !== 'all' ? `?category=${categoryFilter}` : ''}`);
      setFaqs(response.data.data || []);
    } catch (error) {
      toast.error(getApiError(error, 'Failed to fetch FAQs'));
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchFaqs();
  }, [fetchFaqs]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await api.delete(`/faqs/${deleteTarget._id}`);
      toast.success('FAQ deleted successfully');
      setDeleteTarget(null);
      fetchFaqs();
    } catch (error) {
      toast.error('Failed to delete FAQ');
    }
  };

  const categories = ['all', ...Array.from(new Set(faqs.map(f => f.category)))];

  const filteredFaqs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: Column<FAQ>[] = [
    {
      key: 'question',
      header: 'Question',
      sortKey: 'question',
      render: (faq) => <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{faq.question}</span>,
    },
    {
      key: 'answer',
      header: 'Answer',
      sortKey: 'answer',
      render: (faq) => (
        <span className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 max-w-[420px]">{faq.answer}</span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortKey: 'category',
      render: (faq) => <Badge tone="slate">{faq.category}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'status',
      render: (faq) => <Badge tone={faq.isActive ? 'green' : 'slate'}>{faq.isActive ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (faq) => (
        <div className="flex items-center space-x-1">
          <Link to={`/faqs/${faq._id}/edit`} className="admin-icon-btn" title="Edit">
            <Edit className="w-4 h-4" />
          </Link>
          <IconBtn title="Delete" onClick={() => setDeleteTarget(faq)}>
            <Trash2 className="w-4 h-4 text-red-600" />
          </IconBtn>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="FAQs"
      subtitle="Manage frequently asked questions"
      actions={
        <Link to="/faqs/create" className="admin-btn-primary h-10 px-4 text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          Add FAQ
        </Link>
      }
    >
      <DataTable
        columns={columns}
        rows={filteredFaqs}
        rowKey={(faq) => faq._id}
        loading={loading}
        searchable
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search FAQs..."
        filters={
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="admin-input"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        }
        clientPagination
        pageSize={10}
        emptyTitle="No FAQs found"
        emptyBody="Create your first FAQ to get started."
        emptyAction={
          <Link to="/faqs/create" className="admin-btn-primary h-10 px-4 text-sm inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Create your first FAQ
          </Link>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete FAQ"
        body={`Are you sure you want to delete "${deleteTarget?.question}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  );
}
