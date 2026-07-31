import { useState, useEffect } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface FooterSection {
  type: string;
  title?: string;
  content?: string;
  links?: Array<{ label: string; url: string }>;
  sortOrder: number;
  isActive: boolean;
}

export default function FooterEditor() {
  const [sections, setSections] = useState<FooterSection[]>([]);
  const [saving, setSaving] = useState(false);
  const [newSection, setNewSection] = useState({ type: 'text', title: '', content: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFooterSections();
  }, []);

  const fetchFooterSections = async () => {
    try {
      const response = await api.get('/settings');
      const footer = response.data.data?.footer?.sections || [];
      setSections(footer);
    } catch (error) {
      console.error('Failed to fetch footer');
    } finally {
      setLoading(false);
    }
  };

  const addSection = async () => {
    if (!newSection.title && !newSection.content) return;
    
    const section: FooterSection = {
      type: newSection.type,
      title: newSection.title,
      content: newSection.content,
      sortOrder: sections.length,
      isActive: true,
    };
    
    const updated = [...sections, section];
    setSections(updated);
    setNewSection({ type: 'text', title: '', content: '' });
    
    try {
      await api.put('/settings/footer', { sections: updated });
      toast.success('Footer section added');
    } catch (error) {
      toast.error('Failed to add footer section');
      setSections(sections);
    }
  };

  const deleteSection = async (index: number) => {
    const updated = sections.filter((_, i) => i !== index);
    setSections(updated);
    
    try {
      await api.put('/settings/footer', { sections: updated });
      toast.success('Footer section deleted');
    } catch (error) {
      toast.error('Failed to delete footer section');
      setSections(sections);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/settings/footer', { sections });
      toast.success('Footer saved successfully');
    } catch (error) {
      toast.error('Failed to save footer');
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Footer Editor</h2>
          <p className="text-slate-500 dark:text-slate-400">Configure your site footer</p>
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
              Save Footer
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sections list */}
        <div className="lg:col-span-2">
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Footer Sections</h3>
            <div className="space-y-2">
              {sections.map((section, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                        {section.type}
                      </p>
                      {section.title && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{section.title}</p>
                      )}
                      {section.content && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                          {section.content}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {section.sortOrder}
                    </span>
                    <button
                      onClick={() => deleteSection(index)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {sections.length === 0 && (
                <p className="text-center py-8 text-slate-500 dark:text-slate-400">
                  No footer sections yet
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Add new section */}
        <div className="lg:col-span-1">
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Add Section</h3>
            <div className="space-y-4">
              <div>
                <label className="admin-label">Type</label>
                <select
                  value={newSection.type}
                  onChange={(e) => setNewSection({ ...newSection, type: e.target.value })}
                  className="admin-input mt-1"
                >
                  <option value="text">Text</option>
                  <option value="links">Links</option>
                  <option value="social">Social</option>
                  <option value="newsletter">Newsletter</option>
                  <option value="copyright">Copyright</option>
                </select>
              </div>
              <div>
                <label className="admin-label">Title</label>
                <input
                  type="text"
                  value={newSection.title}
                  onChange={(e) => setNewSection({ ...newSection, title: e.target.value })}
                  className="admin-input mt-1"
                  placeholder="Section title"
                />
              </div>
              <div>
                <label className="admin-label">Content</label>
                <textarea
                  value={newSection.content}
                  onChange={(e) => setNewSection({ ...newSection, content: e.target.value })}
                  rows={3}
                  className="admin-input mt-1"
                  placeholder="Section content"
                />
              </div>
              <button
                onClick={addSection}
                className="w-full admin-btn-primary py-2.5 flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Section
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}