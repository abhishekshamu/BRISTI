import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, ChevronRight, FolderTree } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import Toolbar from '../../components/ui/Toolbar';
import IconBtn from '../../components/ui/IconBtn';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import PageSpinner from '../../components/ui/PageSpinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface Category {
  _id: string;
  name: string;
  slug: string;
  subtitle?: string;
  description?: string;
  image?: string;
  bannerImage?: string;
  parentId?: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
  productCount?: number;
  children?: Category[];
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories?includeInactive=true');
      setCategories(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await api.delete(`/categories/${deleteTarget._id}`);
      toast.success('Category deleted successfully');
      setDeleteTarget(null);
      fetchCategories();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const buildTree = (items: Category[], parentId?: string): Category[] => {
    return items
      .filter(item => (parentId ? item.parentId === parentId : !item.parentId))
      .map(item => ({
        ...item,
        children: buildTree(items, item._id),
      }));
  };

  const matchesSearch = (category: Category) =>
    category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    category.slug.toLowerCase().includes(searchQuery.toLowerCase());

  const filterTree = (nodes: Category[]): Category[] =>
    nodes
      .map(node => ({
        ...node,
        children: node.children ? filterTree(node.children) : [],
      }))
      .filter(node => matchesSearch(node) || (node.children?.length ?? 0) > 0);

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = searchQuery.trim() ? true : expandedIds.has(category._id);

    return (
      <div key={category._id}>
        <div
          className="flex items-center py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800"
          style={{ paddingLeft: `${level * 24 + 16}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleExpand(category._id)}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded mr-2"
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          )}
          {!hasChildren && <div className="w-6 mr-2" />}

          <div className="flex-1 flex items-center">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center mr-3">
              <FolderTree className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{category.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">/{category.slug}</p>
              {category.subtitle && (
                <p className="mt-0.5 line-clamp-1 text-xs italic text-slate-400 dark:text-slate-500">{category.subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="hidden text-xs text-slate-400 dark:text-slate-500 sm:block">Order {category.sortOrder ?? 0}</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {category.productCount || 0} products
            </span>
            <Badge tone={category.isActive ? 'green' : 'slate'}>
              {category.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <div className="flex items-center space-x-2">
              <Link to={`/categories/${category._id}/edit`} className="admin-icon-btn">
                <Edit className="w-4 h-4" />
              </Link>
              <IconBtn title="Delete" onClick={() => setDeleteTarget(category)}>
                <Trash2 className="w-4 h-4 text-red-600" />
              </IconBtn>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {category.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const tree = filterTree(buildTree(categories));

  return (
    <PageShell
      title="Categories"
      subtitle="Organize your products into categories"
      actions={
        <Link to="/categories/create" className="admin-btn-primary h-10 px-4 text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          Add Category
        </Link>
      }
    >
      <Toolbar
        searchable
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search categories..."
      />

      <div className="admin-card overflow-hidden">
        {loading ? (
          <PageSpinner />
        ) : tree.length === 0 ? (
          <EmptyState
            title="No categories found"
            body="Create your first category to start organizing products."
            icon={<FolderTree className="w-6 h-6" />}
            action={
              <Link to="/categories/create" className="admin-btn-primary h-10 px-4 text-sm inline-flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Create your first category
              </Link>
            }
          />
        ) : (
          <div>
            {tree.map(category => renderCategory(category))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete category"
        body={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  );
}
