import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import DataTable, { type Column } from '../../components/ui/DataTable';
import IconBtn from '../../components/ui/IconBtn';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { resolveMediaUrl } from '../../lib/mediaUrl';

interface BlogPost {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  featuredImage?: string;
  author: string;
  tags: string[];
  category?: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  publishedAt?: string;
  createdAt: string;
}

const getStatusTone = (status: string) =>
  status === 'published' ? 'green' : status === 'draft' ? 'amber' : 'slate';

export default function Blogs() {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);

  const fetchBlogs = useCallback(async () => {
    try {
      const response = await api.get(`/blogs/all${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`);
      setBlogs(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch blogs');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await api.delete(`/blogs/${deleteTarget._id}`);
      toast.success('Blog post deleted successfully');
      setDeleteTarget(null);
      fetchBlogs();
    } catch (error) {
      toast.error('Failed to delete blog post');
    }
  };

  const filteredBlogs = blogs.filter(blog =>
    blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    blog.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns: Column<BlogPost>[] = [
    {
      key: 'title',
      header: 'Title',
      sortKey: 'title',
      render: (blog) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center overflow-hidden">
            {blog.featuredImage ? (
              <img src={resolveMediaUrl(blog.featuredImage) ?? ''} alt="" className="w-10 h-10 object-cover" />
            ) : (
              <BookOpen className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{blog.title}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">/{blog.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'author',
      header: 'Author',
      sortKey: 'author',
      render: (blog) => <span className="text-sm text-slate-600 dark:text-slate-400">{blog.author}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      sortKey: 'category',
      render: (blog) => <Badge tone="slate">{blog.category || '-'}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      sortKey: 'status',
      render: (blog) => <Badge tone={getStatusTone(blog.status)}>{blog.status}</Badge>,
    },
    {
      key: 'featured',
      header: 'Featured',
      render: (blog) => <Badge tone={blog.featured ? 'green' : 'slate'}>{blog.featured ? 'Yes' : 'No'}</Badge>,
    },
    {
      key: 'publishedAt',
      header: 'Published',
      sortKey: 'publishedAt',
      render: (blog) => (
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {blog.publishedAt ? new Date(blog.publishedAt).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (blog) => (
        <div className="flex items-center space-x-1">
          <Link to={`/blogs/${blog._id}/edit`} className="admin-icon-btn" title="Edit">
            <Edit className="w-4 h-4" />
          </Link>
          <IconBtn title="Delete" onClick={() => setDeleteTarget(blog)}>
            <Trash2 className="w-4 h-4 text-red-600" />
          </IconBtn>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Blog Posts"
      subtitle="Create and manage blog content"
      actions={
        <Link to="/blogs/create" className="admin-btn-primary h-10 px-4 text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          Add Post
        </Link>
      }
    >
      <DataTable
        columns={columns}
        rows={filteredBlogs}
        rowKey={(blog) => blog._id}
        loading={loading}
        searchable
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search blog posts..."
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
        emptyTitle="No blog posts found"
        emptyBody="Create your first post to get started."
        emptyAction={
          <Link to="/blogs/create" className="admin-btn-primary h-10 px-4 text-sm inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Create your first post
          </Link>
        }
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete blog post"
        body={`Are you sure you want to delete "${deleteTarget?.title}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  );
}
