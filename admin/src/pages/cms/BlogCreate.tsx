import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import MediaPicker from '../../components/media/MediaPicker';
import PageShell from '../../components/ui/PageShell';
import StickySaveBar from '../../components/ui/StickySaveBar';
import { useUnsavedChanges } from '../../lib/unsaved-context';

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

export default function BlogCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { dirty, setDirty } = useUnsavedChanges();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<BlogForm>({
    defaultValues: {
      status: 'draft',
      featured: false,
      tags: '',
      seoKeywords: '',
    },
  });

  useEffect(() => {
    setDirty(isDirty);
  }, [isDirty, setDirty]);

  const content = watch('content');
  const featuredImage = watch('featuredImage');

  const onSubmit = async (data: BlogForm) => {
    try {
      setLoading(true);
      // Backend stores SEO under a nested `seo` object; the flat form fields
      // are mapped here so SEO settings are not silently dropped.
      const { seoTitle, seoDescription, seoKeywords, ...rest } = data;
      const payload = {
        ...rest,
        tags: data.tags ? data.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
        seo: {
          ...(seoTitle ? { title: seoTitle } : {}),
          ...(seoDescription ? { description: seoDescription } : {}),
          ...(seoKeywords
            ? { keywords: seoKeywords.split(',').map((k: string) => k.trim()).filter(Boolean) }
            : {}),
        },
      };
      const response = await api.post('/blogs', payload);
      toast.success('Blog post created successfully');
      navigate(`/blogs/${response.data.data._id}/edit`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create blog post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Add Blog Post"
      subtitle="Create a new blog post"
      breadcrumbs={[{ label: 'Blog', to: '/blogs' }]}
      backTo="/blogs"
      sidebar={
        <>
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
                  placeholder="Category"
                />
              </div>

              <div>
                <label className="admin-label">Tags (comma separated)</label>
                <input
                  {...register('tags')}
                  className="admin-input mt-1"
                  placeholder="tag1, tag2, tag3"
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
        </>
      }
    >
      <form id="blog-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="admin-card p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Content</h3>
          <div className="space-y-4">
            <div>
              <label className="admin-label">Title</label>
              <input
                {...register('title', { required: 'Title is required' })}
                className="admin-input mt-1"
                placeholder="Blog post title"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
            </div>

            <div>
              <label className="admin-label">Slug</label>
              <input
                {...register('slug', { required: 'Slug is required' })}
                className="admin-input mt-1"
                placeholder="blog-post-slug"
              />
              {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>}
            </div>

            <div>
              <label className="admin-label">Excerpt</label>
              <textarea
                {...register('excerpt', { required: 'Excerpt is required' })}
                rows={2}
                className="admin-input mt-1"
                placeholder="Brief excerpt"
              />
              {errors.excerpt && <p className="mt-1 text-sm text-red-600">{errors.excerpt.message}</p>}
            </div>

            <div>
              <label className="admin-label">Content</label>
              <div className="mt-1">
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={(value) => setValue('content', value, { shouldDirty: true })}
                  style={{ height: '300px' }}
                />
              </div>
            </div>

            <div>
              <MediaPicker
                label="Featured Image"
                value={featuredImage}
                onChange={(url) => setValue('featuredImage', url, { shouldDirty: true })}
                ratio="blogFeatured"
                folder="blogs"
              />
            </div>
          </div>
        </div>
      </form>
      <StickySaveBar
        dirty={dirty}
        saving={loading}
        onSave={() => handleSubmit(onSubmit)()}
        onCancel={() => navigate('/blogs')}
        saveLabel="Save Post"
      />
    </PageShell>
  );
}