import { useState, useEffect } from 'react';
import { Search, Filter, AlertTriangle, Package, SlidersHorizontal, X } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface InventoryItem {
  _id: string;
  productId: string;
  variantId?: string;
  sku: string;
  quantity: number;
  reserved: number;
  location: string;
  reorderPoint: number;
  maxStockLevel: number;
  cost: number;
  lastUpdated: string;
  product?: {
    name: string;
    images: Array<{ url: string }>;
  };
}

export default function Inventory() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await api.get('/inventory');
      setInventory(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const openAdjust = (item: InventoryItem) => {
    setEditing(item);
    setQty(item.quantity);
    setReason('');
  };

  const saveAdjust = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      await api.put(`/inventory/${editing._id}`, { quantity: qty, reason: reason.trim() || 'Manual adjustment' });
      toast.success('Stock updated — history recorded and product stock synced');
      setEditing(null);
      fetchInventory();
    } catch (error) {
      toast.error('Failed to update stock');
    } finally {
      setSaving(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.product?.name && item.product.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (filter === 'low') return matchesSearch && item.quantity <= item.reorderPoint && item.quantity > 0;
    if (filter === 'out') return matchesSearch && item.quantity === 0;
    return matchesSearch;
  });

  const lowStockCount = inventory.filter(item => item.quantity <= item.reorderPoint && item.quantity > 0).length;
  const outOfStockCount = inventory.filter(item => item.quantity === 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Inventory</h2>
          <p className="text-slate-500 dark:text-slate-400">Track and manage your stock levels</p>
        </div>
        <button onClick={() => toast('Export coming soon')} className="admin-btn-secondary py-2.5 px-4 flex items-center">
          <Filter className="w-4 h-4 mr-2" />
          Export
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Products</p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-1">{inventory.length}</p>
            </div>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <Package className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            </div>
          </div>
        </div>

        <div className="admin-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Low Stock</p>
              <p className="text-2xl font-semibold text-yellow-600 mt-1">{lowStockCount}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-700 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="admin-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Out of Stock</p>
              <p className="text-2xl font-semibold text-red-600 mt-1">{outOfStockCount}</p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-700 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU or product name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="admin-input pl-10"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="admin-input"
          >
            <option value="all">All Items</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Inventory table */}
      <div className="admin-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Product</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">SKU</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Location</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Quantity</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Reserved</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Available</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Reorder Point</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => {
                    const available = item.quantity - item.reserved;
                    const isLow = item.quantity <= item.reorderPoint && item.quantity > 0;
                    const isOut = item.quantity === 0;

                    return (
                      <tr key={item._id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center">
                              {item.product?.images?.[0]?.url ? (
                                <img src={item.product.images[0].url} alt="" className="w-10 h-10 object-cover rounded-md" />
                              ) : (
                                <Package className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {item.product?.name || 'Unknown Product'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm font-mono text-slate-600 dark:text-slate-400">
                          {item.sku}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                          {item.location}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                          {item.reserved}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-slate-100">
                          {available}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                          {item.reorderPoint}
                        </td>
                        <td className="py-3 px-4">
                          {isOut ? (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => openAdjust(item)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                            title="Adjust stock"
                          >
                            <SlidersHorizontal className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredInventory.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No inventory items found</p>
              </div>
            )}
          </>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)}>
          <div className="w-full max-w-md admin-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Adjust Stock</h3>
              <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="mt-4 space-y-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{editing.product?.name || 'Product'}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{editing.sku}</p>
              <p className="text-xs text-slate-400">Current quantity: {editing.quantity} · Reserved: {editing.reserved} · Reorder point: {editing.reorderPoint}</p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New quantity</label>
              <input
                type="number"
                min={0}
                value={qty}
                onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="admin-input"
              />
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reason</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Received restock, damaged units removed…"
                className="admin-input"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditing(null)} className="admin-btn-secondary py-2 px-4">Cancel</button>
              <button onClick={saveAdjust} disabled={saving} className="admin-btn-primary py-2 px-4">
                {saving ? 'Saving...' : 'Save Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}