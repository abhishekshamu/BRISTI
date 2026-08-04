import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface BlogForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  author: string;
  tags: string;
  category?: string;
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords: string;
}

export default function BlogEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<BlogForm>();

  const content = watch('content');

  const fetchBlog = useCallback(async () => {
    try {
      const response = await api.get(`/blogs/${id}`);
      const blog = response.data.data;
      reset({
        ...blog,
        tags: blog.tags?.join(', ') || '',
        seoKeywords: blog.seo?.keywords?.join(', ') || '',
      });
    } catch (error) {
      toast.error('Failed to fetch blog post');
      navigate('/blogs');
    } finally {
      setLoading(false);
    }
  }, [id, reset, navigate]);

  useEffect(() => {
    if (id) {
      fetchBlog();
    }
  }, [id, fetchBlog]);

  const onSubmit = async (data: BlogForm) => {
    try {
      setSaving(true);
      await api.put(`/blogs/${id}`, data);
      toast.success('Blog post updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update blog post');
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/blogs')}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Edit Blog Post</h2>
            <p className="text-slate-500 dark:text-slate-400">Update blog post content</p>
          </div>
        </div>
        <button
          type="submit"
          form="blog-form"
          disabled={saving}
          className="admin-btn-primary py-2.5 px-4 flex items-center"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </button>
      </div>

      <form id="blog-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                  />
                  {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
                </div>

                <div>
                  <label className="admin-label">Slug</label>
                  <input
                    {...register('slug', { required: 'Slug is required' })}
                    className="admin-input mt-1"
                  />
                  {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>}
                </div>

                <div>
                  <label className="admin-label">Excerpt</label>
                  <textarea
                    {...register('excerpt', { required: 'Excerpt is required' })}
                    rows={2}
                    className="admin-input mt-1"
                  />
                  {errors.excerpt && <p className="mt-1 text-sm text-red-600">{errors.excerpt.message}</p>}
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
                  <label className="admin-label">Featured Image URL</label>
                  <input
                    {...register('featuredImage')}
                    className="admin-input mt-1"
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
                  <label className="admin-label">Author</label>
                  <input
                    {...register('author', { required: 'Author is required' })}
                    className="admin-input mt-1"
                  />
                  {errors.author && <p className="mt-1 text-sm text-red-600">{errors.author.message}</p>}
                </div>

                <div>
                  <label className="admin-label">Category</label>
                  <input
                    {...register('category')}
                    className="admin-input mt-1"
                  />
                </div>

                <div>
                  <label className="admin-label">Tags (comma separated)</label>
                  <input
                    {...register('tags')}
                    className="admin-input mt-1"
                  />
                </div>

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
                  <label className="admin-label">Featured</label>
                  <input
                    type="checkbox"
                    {...register('featured')}
                    className="w-4 h-4"
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