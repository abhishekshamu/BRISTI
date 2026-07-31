import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Layers } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Collection {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  bannerImage?: string;
  products: string[];
  featured: boolean;
  isActive: boolean;
  createdAt: string;
}

export default function Collections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await api.get('/collections');
      setCollections(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch collections');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return;
    
    try {
      await api.delete(`/collections/${id}`);
      toast.success('Collection deleted successfully');
      fetchCollections();
    } catch (error) {
      toast.error('Failed to delete collection');
    }
  };

  const filteredCollections = collections.filter(col =>
    col.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Collections</h2>
          <p className="text-slate-500 dark:text-slate-400">Create and manage product collections</p>
        </div>
        <Link to="/collections/create" className="admin-btn-primary py-2.5 px-4 flex items-center">
          <Plus className="w-4 h-4 mr-2" />
          Add Collection
        </Link>
      </div>

      {/* Search */}
      <div className="admin-card p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-input pl-10"
          />
        </div>
      </div>

      {/* Collections grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : (
          filteredCollections.map((collection) => (
            <div key={collection._id} className="admin-card overflow-hidden group">
              {collection.bannerImage || collection.image ? (
                <img
                  src={collection.bannerImage || collection.image}
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
                    <Link
                      to={`/collections/${collection._id}/edit`}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                    >
                      <Edit className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </Link>
                    <button
                      onClick={() => handleDelete(collection._id)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {collection.products.length} products
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    collection.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {collection.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}