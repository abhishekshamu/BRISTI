import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Layers } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import Toolbar from '../../components/ui/Toolbar';
import IconBtn from '../../components/ui/IconBtn';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import PageSpinner from '../../components/ui/PageSpinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { resolveMediaUrl } from '../../lib/mediaUrl';

interface Collection {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  bannerImage?: string;
  bannerTablet?: string;
  mobileBanner?: string;
  icon?: string;
  productCount?: number;
  featured: boolean;
  isActive: boolean;
  showOnHomepage: boolean;
  showInNavigation: boolean;
  sortOrder: number;
  themeColor?: string;
  createdAt: string;
}

export default function Collections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Collection | null>(null);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await api.get('/collections?includeInactive=true');
      setCollections(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch collections');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await api.delete(`/collections/${deleteTarget._id}`);
      toast.success('Collection deleted successfully');
      setDeleteTarget(null);
      fetchCollections();
    } catch (error) {
      toast.error('Failed to delete collection');
    }
  };

  const filteredCollections = collections.filter(col =>
    col.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageShell
      title="Collections"
      subtitle="Create and manage product collections"
      actions={
        <Link to="/collections/create" className="admin-btn-primary h-10 px-4 text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          Add Collection
        </Link>
      }
    >
      <Toolbar
        searchable
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search collections..."
      />

      {loading ? (
        <PageSpinner />
      ) : filteredCollections.length === 0 ? (
        <EmptyState
          title="No collections found"
          body="Create your first collection to start grouping products."
          icon={<Layers className="w-6 h-6" />}
          action={
            <Link to="/collections/create" className="admin-btn-primary h-10 px-4 text-sm inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Create your first collection
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCollections.map((collection) => (
            <div key={collection._id} className="admin-card overflow-hidden group">
              {collection.bannerImage || collection.image ? (
                <img
                  src={resolveMediaUrl(collection.bannerImage || collection.image) ?? ''}
                  alt={collection.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Layers className="w-12 h-12 text-slate-300" />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{collection.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {collection.shortDescription || collection.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link to={`/collections/${collection._id}/edit`} className="admin-icon-btn">
                      <Edit className="w-4 h-4" />
                    </Link>
                    <IconBtn title="Delete" onClick={() => setDeleteTarget(collection)}>
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </IconBtn>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {collection.productCount ?? 0} products
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {collection.showOnHomepage && <Badge tone="blue">Homepage</Badge>}
                    {collection.showInNavigation && <Badge tone="purple">Nav</Badge>}
                    {collection.featured && <Badge tone="amber">Featured</Badge>}
                    <Badge tone={collection.isActive ? 'green' : 'slate'}>
                      {collection.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete collection"
        body={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageShell>
  );
}
