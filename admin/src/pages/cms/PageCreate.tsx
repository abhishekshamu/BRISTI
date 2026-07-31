import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface PageForm {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImage?: string;
  status: 'draft' | 'published' | 'archived';
  isInMenu: boolean;
  menuOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string;
}

export default function PageCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PageForm>({
    defaultValues: {
      status: 'draft',
      isInMenu: false,
      menuOrder: 0,
      seoKeywords: '',
    },
  });

  const content = watch('content');

  const onSubmit = async (data: PageForm) => {
    try {
      setLoading(true);
      const response = await api.post('/pages', data);
      toast.success('Page created successfully');
      navigate(`/pages/${response.data.data._id}/edit`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create page');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/pages')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Add Page</h2>
            <p className="text-slate-500 dark:text-slate-400">Create a new CMS page</p>
          </div>
        </div>
        <button
          type="submit"
          form="page-form"
          disabled={loading}
          className="admin-btn-primary py-2.5 px-4 flex items-center"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Page
            </>
          )}
        </button>
      </div>

      <form id="page-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="admin-card p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Content</h3>
              <div className="space-y-4">
                <div>
                  <label className="admin-label">Title</label>
                  <input
                    {...register('title', { required: 'Title is required' })}
                    className="admin-input mt-1"
                    placeholder="Page title"
                  />
                  {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
                </div>

                <div>
                  <label className="admin-label">Slug</label>
                  <input
                    {...register('slug', { required: 'Slug is required' })}
                    className="admin-input mt-1"
                    placeholder="page-url-slug"
                  />
                  {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>}
                </div>

                <div>
                  <label className="admin-label">Content</label>
                  <div className="mt-1">
                    <ReactQuill
                      theme="snow"
                      value={content}
                      onChange={(value) => setValue('content', value)}
                      style={{ height: '300px' }}
                    />
                  </div>
                </div>

                <div>
                  <label className="admin-label">Excerpt</label>
                  <textarea
                    {...register('excerpt')}
                    rows={2}
                    className="admin-input mt-1"
                    placeholder="Brief excerpt"
                  />
                </div>

                <div>
                  <label className="admin-label">Featured Image URL</label>
                  <input
                    {...register('featuredImage')}
                    className="admin-input mt-1"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="admin-card p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="admin-label">Status</label>
                  <select
                    {...register('status')}
                    className="admin-input mt-1"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="admin-label">Show in Menu</label>
                  <input
                    type="checkbox"
                    {...register('isInMenu')}
                    className="w-4 h-4"
                  />
                </div>

                <div>
                  <label className="admin-label">Menu Order</label>
                  <input
                    type="number"
                    {...register('menuOrder', { valueAsNumber: true })}
                    className="admin-input mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="admin-card p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">SEO</h3>
              <div className="space-y-4">
                <div>
                  <label className="admin-label">SEO Title</label>
                  <input
                    {...register('seoTitle')}
                    className="admin-input mt-1"
                  />
                </div>
                <div>
                  <label className="admin-label">SEO Description</label>
                  <textarea
                    {...register('seoDescription')}
                    rows={2}
                    className="admin-input mt-1"
                  />
                </div>
                <div>
                  <label className="admin-label">SEO Keywords</label>
                  <input
                    {...register('seoKeywords')}
                    className="admin-input mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}