import { useState, useEffect, useRef, useCallback } from 'react';
import { Globe } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import MediaPicker from '../../components/media/MediaPicker';
import PageShell from '../../components/ui/PageShell';
import StickySaveBar from '../../components/ui/StickySaveBar';
import PageSpinner from '../../components/ui/PageSpinner';
import { useUnsavedChanges } from '../../lib/unsaved-context';

interface SeoSettings {
  defaultTitle: string;
  defaultDescription: string;
  defaultImage: string;
  facebookAppId: string;
  twitterHandle: string;
  googleAnalyticsId: string;
  googleTagManagerId: string;
  robots: { index: boolean; follow: boolean };
  structuredData: boolean;
  openGraph: boolean;
  twitterCards: boolean;
}

const DEFAULT_SETTINGS: SeoSettings = {
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
};

export default function SeoManagement() {
  const { dirty, setDirty } = useUnsavedChanges();
  const [settings, setSettings] = useState<SeoSettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const baselineRef = useRef<SeoSettings | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.data?.seo) {
        const merged = { ...DEFAULT_SETTINGS, ...response.data.data.seo };
        setSettings(merged);
        baselineRef.current = merged;
      }
    } catch (error) {
      console.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = (next: SeoSettings) => {
    setSettings(next);
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/settings/seo', settings);
      setDirty(false);
      baselineRef.current = settings;
      toast.success('SEO settings saved successfully');
    } catch (error) {
      toast.error('Failed to save SEO settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (baselineRef.current) {
      setSettings(baselineRef.current);
    }
    setDirty(false);
  };

  if (loading) {
    return <PageSpinner label="Loading SEO settings…" />;
  }

  return (
    <PageShell title="SEO Management" subtitle="Optimize your store for search engines">
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
                onChange={(e) => updateSettings({ ...settings, defaultTitle: e.target.value })}
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
                onChange={(e) => updateSettings({ ...settings, defaultDescription: e.target.value })}
                rows={3}
                className="admin-input mt-1"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {settings.defaultDescription.length}/160 characters
              </p>
            </div>
            <MediaPicker
              label="Default Image"
              value={settings.defaultImage}
              onChange={(url) => updateSettings({ ...settings, defaultImage: url })}
              ratio="seo"
              folder="seo"
            />
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
                onChange={(e) => updateSettings({ ...settings, facebookAppId: e.target.value })}
                className="admin-input mt-1"
              />
            </div>
            <div>
              <label className="admin-label">Twitter Handle</label>
              <input
                type="text"
                value={settings.twitterHandle}
                onChange={(e) => updateSettings({ ...settings, twitterHandle: e.target.value })}
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
                onChange={(e) => updateSettings({ ...settings, googleAnalyticsId: e.target.value })}
                className="admin-input mt-1"
              />
            </div>
            <div>
              <label className="admin-label">Google Tag Manager ID</label>
              <input
                type="text"
                value={settings.googleTagManagerId}
                onChange={(e) => updateSettings({ ...settings, googleTagManagerId: e.target.value })}
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
                onChange={(e) => updateSettings({
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
                onChange={(e) => updateSettings({ ...settings, structuredData: e.target.checked })}
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
                onChange={(e) => updateSettings({ ...settings, openGraph: e.target.checked })}
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
                onChange={(e) => updateSettings({ ...settings, twitterCards: e.target.checked })}
                className="w-4 h-4"
              />
            </div>
          </div>
        </div>
      </div>

      <StickySaveBar
        dirty={dirty}
        onSave={handleSave}
        onCancel={handleCancel}
        saving={saving}
        saveLabel="Save Settings"
      />
    </PageShell>
  );
}
