import { useState, useEffect } from 'react';
import { Globe, Save } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function SeoManagement() {
  const [settings, setSettings] = useState({
    defaultTitle: 'BRISTI - Luxury Clothing Brand',
    defaultDescription: 'Discover timeless elegance and modern sophistication with BRISTI luxury clothing.',
    defaultImage: '/og-image.jpg',
    facebookAppId: '',
    twitterHandle: '',
    googleAnalyticsId: '',
    googleTagManagerId: '',
    robots: { index: true, follow: true },
    structuredData: true,
    openGraph: true,
    twitterCards: true,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.data?.seo) {
        setSettings({ ...settings, ...response.data.data.seo });
      }
    } catch (error) {
      console.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/settings/seo', settings);
      toast.success('SEO settings saved successfully');
    } catch (error) {
      toast.error('Failed to save SEO settings');
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">SEO Management</h2>
          <p className="text-slate-500 dark:text-slate-400">Optimize your store for search engines</p>
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
              Save Settings
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General SEO */}
        <div className="admin-card p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Globe className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">General SEO</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="admin-label">Default Title</label>
              <input
                type="text"
                value={settings.defaultTitle}
                onChange={(e) => setSettings({ ...settings, defaultTitle: e.target.value })}
                className="admin-input mt-1"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {settings.defaultTitle.length}/60 characters
              </p>
            </div>
            <div>
              <label className="admin-label">Default Description</label>
              <textarea
                value={settings.defaultDescription}
                onChange={(e) => setSettings({ ...settings, defaultDescription: e.target.value })}
                rows={3}
                className="admin-input mt-1"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {settings.defaultDescription.length}/160 characters
              </p>
            </div>
            <div>
              <label className="admin-label">Default Image URL</label>
              <input
                type="text"
                value={settings.defaultImage}
                onChange={(e) => setSettings({ ...settings, defaultImage: e.target.value })}
                className="admin-input mt-1"
              />
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Social Media</h3>
          <div className="space-y-4">
            <div>
              <label className="admin-label">Facebook App ID</label>
              <input
                type="text"
                value={settings.facebookAppId}
                onChange={(e) => setSettings({ ...settings, facebookAppId: e.target.value })}
                className="admin-input mt-1"
              />
            </div>
            <div>
              <label className="admin-label">Twitter Handle</label>
              <input
                type="text"
                value={settings.twitterHandle}
                onChange={(e) => setSettings({ ...settings, twitterHandle: e.target.value })}
                className="admin-input mt-1"
              />
            </div>
          </div>
        </div>

        {/* Analytics */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Analytics</h3>
          <div className="space-y-4">
            <div>
              <label className="admin-label">Google Analytics ID</label>
              <input
                type="text"
                value={settings.googleAnalyticsId}
                onChange={(e) => setSettings({ ...settings, googleAnalyticsId: e.target.value })}
                className="admin-input mt-1"
              />
            </div>
            <div>
              <label className="admin-label">Google Tag Manager ID</label>
              <input
                type="text"
                value={settings.googleTagManagerId}
                onChange={(e) => setSettings({ ...settings, googleTagManagerId: e.target.value })}
                className="admin-input mt-1"
              />
            </div>
          </div>
        </div>

        {/* Advanced */}
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Advanced</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="admin-label">Enable Robots Indexing</label>
                <p className="text-xs text-slate-500 dark:text-slate-400">Allow search engines to index your site</p>
              </div>
              <input
                type="checkbox"
                checked={settings.robots.index}
                onChange={(e) => setSettings({
                  ...settings,
                  robots: { ...settings.robots, index: e.target.checked }
                })}
                className="w-4 h-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="admin-label">Enable Structured Data</label>
                <p className="text-xs text-slate-500 dark:text-slate-400">Add JSON-LD structured data</p>
              </div>
              <input
                type="checkbox"
                checked={settings.structuredData}
                onChange={(e) => setSettings({ ...settings, structuredData: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="admin-label">Enable Open Graph</label>
                <p className="text-xs text-slate-500 dark:text-slate-400">Add Open Graph meta tags</p>
              </div>
              <input
                type="checkbox"
                checked={settings.openGraph}
                onChange={(e) => setSettings({ ...settings, openGraph: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <label className="admin-label">Enable Twitter Cards</label>
                <p className="text-xs text-slate-500 dark:text-slate-400">Add Twitter Card meta tags</p>
              </div>
              <input
                type="checkbox"
                checked={settings.twitterCards}
                onChange={(e) => setSettings({ ...settings, twitterCards: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}