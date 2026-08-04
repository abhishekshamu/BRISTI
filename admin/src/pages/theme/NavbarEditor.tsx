import { useState, useEffect } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface NavItem {
  _id?: string;
  label: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
}

export default function NavbarEditor() {
  const [items, setItems] = useState<NavItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState({ label: '', url: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNavItems();
  }, []);

  const fetchNavItems = async () => {
    try {
      const response = await api.get('/settings');
      const navbar = response.data.data?.navbar?.items || [];
      setItems(navbar);
    } catch (error) {
      console.error('Failed to fetch navbar');
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    if (!newItem.label || !newItem.url) return;
    
    const item: NavItem = {
      label: newItem.label,
      url: newItem.url,
      sortOrder: items.length,
      isActive: true,
    };
    
    const updated = [...items, item];
    setItems(updated);
    setNewItem({ label: '', url: '' });
    
    try {
      await api.put('/settings/navbar', { items: updated });
      toast.success('Nav item added');
    } catch (error) {
      toast.error('Failed to save navbar');
      setItems(items);
    }
  };

  const deleteItem = async (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    
    try {
      await api.put('/settings/navbar', { items: updated });
      toast.success('Nav item deleted');
    } catch (error) {
      toast.error('Failed to delete nav item');
      setItems(items);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/settings/navbar', { items });
      toast.success('Navbar saved successfully');
    } catch (error) {
      toast.error('Failed to save navbar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Navbar Editor</h2>
          <p className="text-slate-500 dark:text-slate-400">Configure your site navigation</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="admin-btn-primary py-2.5 px-4 flex items-center"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Navbar
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nav items list */}
        <div className="lg:col-span-2">
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Navigation Items</h3>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{item.label}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      Order: {item.sortOrder}
                    </span>
                    <button
                      onClick={() => deleteItem(index)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No navigation items yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Add new item */}
        <div className="lg:col-span-1">
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Add Item</h3>
            <div className="space-y-4">
              <div>
                <label className="admin-label">Label</label>
                <input
                  type="text"
                  value={newItem.label}
                  onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
                  className="admin-input mt-1"
                  placeholder="Home"
                />
              </div>
              <div>
                <label className="admin-label">URL</label>
                <input
                  type="text"
                  value={newItem.url}
                  onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                  className="admin-input mt-1"
                  placeholder="/"
                />
              </div>
              <button
                onClick={addItem}
                className="w-full admin-btn-primary py-2.5 flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to Navbar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}