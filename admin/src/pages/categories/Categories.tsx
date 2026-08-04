import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronRight,
  FolderTree,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

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

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted successfully');
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

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedIds.has(category._id);

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
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              category.isActive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {category.isActive ? 'Active' : 'Inactive'}
            </span>
            <div className="flex items-center space-x-2">
              <Link
                to={`/categories/${category._id}/edit`}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
              >
                <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </Link>
              <button
                onClick={() => handleDelete(category._id)}
                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
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

  const tree = buildTree(categories);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Categories</h2>
          <p className="text-slate-500 dark:text-slate-400">Organize your products into categories</p>
        </div>
        <Link to="/categories/create" className="admin-btn-primary py-2.5 px-4 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Link>
      </div>

      {/* Search */}
      <div className="admin-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-input pl-10"
          />
        </div>
      </div>

      {/* Categories list */}
      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : (
          <div>
            {tree.map(category => renderCategory(category))}
            {tree.length === 0 && (
              <div className="text-center py-12">
                <FolderTree className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No categories found</p>
                <Link to="/categories/create" className="admin-btn-primary mt-4 py-2 px-4 inline-flex items-center">
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first category
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}