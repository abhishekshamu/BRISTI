import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Filter, Pencil, Trash2, Package } from 'lucide-react';
import PageShell from '../../components/ui/PageShell';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import IconBtn from '../../components/ui/IconBtn';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import api, { getApiError } from '../../lib/api';
import { resolveMediaUrl } from '../../lib/mediaUrl';
import toast from 'react-hot-toast';

interface Product {
  _id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  status: 'draft' | 'active' | 'archived';
  category: any;
  images: Array<{ url: string }>;
  description?: string;
  createdAt: string;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const debouncedSearch = useDebouncedValue(searchQuery);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/products?page=${page}&limit=20&status=${statusFilter}&search=${encodeURIComponent(debouncedSearch)}`);
      setProducts(response.data.data);
      setTotalPages(response.data.pagination?.pages || 1);
      setTotal(response.data.pagination?.total ?? response.data.data?.length ?? 0);
    } catch (error) {
      toast.error(getApiError(error, 'Failed to fetch products'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async () => {
    if (!deleting) return;

    try {
      await api.delete(`/products/${deleting._id}`);
      toast.success('Product deleted successfully');
      setDeleting(null);
      fetchProducts();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to delete product'));
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPage(1);
  };

  const columns: Column<Product>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (product) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center shrink-0">
            {product.images?.[0]?.url ? (
              <img src={resolveMediaUrl(product.images[0].url) ?? ''} alt={product.name} className="w-10 h-10 object-cover rounded-md" />
            ) : (
              <Package className="w-5 h-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{product.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
              {product.description?.substring(0, 50)}...
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'sku',
      header: 'SKU',
      render: (product) => <span className="font-mono text-slate-600 dark:text-slate-400">{product.sku}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (product) => (
        <span className="text-slate-600 dark:text-slate-400">
          {typeof product.category === 'object' ? product.category?.name : product.category}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (product) => (
        <span className="font-medium text-slate-900 dark:text-slate-100">
          ${product.price?.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (product) => (
        <span className={product.stock <= 5 ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
          {product.stock}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (product) => (
        <Badge tone={product.status === 'active' ? 'green' : product.status === 'draft' ? 'amber' : 'slate'}>
          {product.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (product) => (
        <div className="flex items-center gap-1">
          <Link to={`/products/${product._id}/edit`} title="Edit" aria-label="Edit" className="admin-icon-btn">
            <Pencil className="w-4 h-4" />
          </Link>
          <IconBtn title="Delete" onClick={() => setDeleting(product)} className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 className="w-4 h-4" />
          </IconBtn>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Products"
      subtitle="Manage your product inventory"
      breadcrumbs={[{ label: 'Products' }]}
      actions={
        <Link to="/products/create" className="admin-btn-primary h-10 px-4 text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          Add Product
        </Link>
      }
    >
      <DataTable
        columns={columns}
        rows={products}
        rowKey={(product) => product._id}
        loading={loading}
        searchable
        searchValue={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          setPage(1);
        }}
        searchPlaceholder="Search products..."
        filters={
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="admin-input !w-auto h-10 text-sm"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        }
        toolbarActions={
          <button onClick={resetFilters} className="admin-btn-secondary h-10 px-4 text-sm flex items-center gap-1.5">
            <Filter className="w-4 h-4" />
            Reset Filters
          </button>
        }
        pagination={{ page, pages: totalPages, total, onPageChange: setPage }}
        emptyTitle="No products found"
        emptyBody="Try adjusting your search or filters, or add a new product to get started."
        emptyAction={
          <Link to="/products/create" className="admin-btn-primary h-9 px-4 text-sm inline-flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Add Product
          </Link>
        }
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete product"
        body={`Are you sure you want to delete "${deleting?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </PageShell>
  );
}
