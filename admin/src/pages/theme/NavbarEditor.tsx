import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Image } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import MediaPicker from '../../components/media/MediaPicker';
import PageShell from '../../components/ui/PageShell';
import StickySaveBar from '../../components/ui/StickySaveBar';
import PageSpinner from '../../components/ui/PageSpinner';
import { useUnsavedChanges } from '../../lib/unsaved-context';

interface NavItem {
  _id?: string;
  label: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
}

export default function NavbarEditor() {
  const { dirty, setDirty } = useUnsavedChanges();
  const [items, setItems] = useState<NavItem[]>([]);
  const [logo, setLogo] = useState('');
  const [icon, setIcon] = useState('');
  const [saving, setSaving] = useState(false);
  const [newItem, setNewItem] = useState({ label: '', url: '' });
  const [loading, setLoading] = useState(true);
  const baselineRef = useRef<{ logo: string; icon: string }>({ logo: '', icon: '' });

  useEffect(() => {
    fetchNavItems();
  }, []);

  const fetchNavItems = async () => {
    try {
      const response = await api.get('/settings');
      const navbar = response.data.data?.navbar?.items || [];
      setItems(navbar);
      setLogo(response.data.data?.logo || '');
      setIcon(response.data.data?.favicon || '');
      baselineRef.current = {
        logo: response.data.data?.logo || '',
        icon: response.data.data?.favicon || '',
      };
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
      await api.put('/settings/branding', { logo, favicon: icon });
      setDirty(false);
      baselineRef.current = { logo, icon };
      toast.success('Navbar saved successfully');
    } catch (error) {
      toast.error('Failed to save navbar');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setLogo(baselineRef.current.logo);
    setIcon(baselineRef.current.icon);
    setDirty(false);
  };

  if (loading) {
    return <PageSpinner label="Loading navbar…" />;
  }

  return (
    <PageShell title="Navbar Editor" subtitle="Configure your site navigation">
      <div className="admin-card p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          <Image className="w-5 h-5 text-slate-600" /> Branding
        </h3>
        <div className="space-y-4">
          <MediaPicker
            label="Logo"
            value={logo}
            onChange={(url) => {
              setLogo(url);
              setDirty(true);
            }}
            ratio="logo"
            folder="navbar"
          />
          <MediaPicker
            label="Favicon"
            value={icon}
            onChange={(url) => {
              setIcon(url);
              setDirty(true);
            }}
            ratio="logo"
            folder="navbar"
          />
        </div>
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

      <StickySaveBar
        dirty={dirty}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
        saveLabel="Save Navbar"
      />
    </PageShell>
  );
}
