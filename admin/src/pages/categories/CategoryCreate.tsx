import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import MediaPicker from '../../components/media/MediaPicker';
import PageShell from '../../components/ui/PageShell';
import StickySaveBar from '../../components/ui/StickySaveBar';
import { useUnsavedChanges } from '../../lib/unsaved-context';

interface CategoryForm {
  name: string;
  slug?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  bannerImage?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export default function CategoryCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const { dirty, setDirty } = useUnsavedChanges();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<CategoryForm>({
    defaultValues: {
      isActive: true,
      sortOrder: 0,
    },
  });

  useEffect(() => setDirty(isDirty), [isDirty, setDirty]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories?includeInactive=true');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories');
    }
  };

  const onSubmit = async (data: CategoryForm) => {
    try {
      setLoading(true);
      await api.post('/categories', {
        ...data,
        sortOrder: Number(data.sortOrder ?? 0),
        seo: { title: data.seoTitle, description: data.seoDescription },
        slug: data.slug?.trim() || undefined,
      });
      toast.success('Category created successfully');
      setDirty(false);
      navigate('/categories');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Add Category"
      subtitle="Create a new category"
      breadcrumbs={[{ label: 'Categories', to: '/categories' }, { label: 'Add Category' }]}
      backTo="/categories"
      sidebar={
        <>
          <div className="admin-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Media</h3>
            <MediaPicker
              label="Category Image"
              value={watch('image') ?? ''}
              onChange={(url) => setValue('image', url, { shouldDirty: true })}
              ratio="category"
              folder="categories"
            />
            <MediaPicker
              label="Category Banner"
              value={watch('bannerImage') ?? ''}
              onChange={(url) => setValue('bannerImage', url, { shouldDirty: true })}
              ratio="categoryBanner"
              folder="categories"
            />
          </div>

          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Status</h3>
            <div className="flex items-center justify-between">
              <label className="admin-label">Status (Active)</label>
              <input type="checkbox" {...register('isActive')} className="w-4 h-4" />
            </div>
          </div>

          <div className="admin-card p-6 space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">SEO</h3>
            <div>
              <label className="admin-label">SEO Title</label>
              <input {...register('seoTitle')} placeholder={`e.g. BRISTI | ${'{Category Name}'}`} className="admin-input mt-1" />
            </div>
            <div>
              <label className="admin-label">SEO Description</label>
              <textarea {...register('seoDescription')} rows={2} className="admin-input mt-1" />
            </div>
          </div>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="admin-card p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Basic Information</h3>
          <div>
            <label className="admin-label">Category Name</label>
            <input {...register('name', { required: 'Name is required' })} className="admin-input mt-1" />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="admin-label">Category Slug</label>
            <input {...register('slug')} placeholder="auto-generated from name" className="admin-input mt-1" />
            <p className="admin-hint mt-1">Leave empty to auto-generate from the name</p>
          </div>
          <div>
            <label className="admin-label">Category Subtitle</label>
            <textarea {...register('subtitle')} rows={2} placeholder="Shown as the premium description on the category landing page" className="admin-input mt-1" />
          </div>
          <div>
            <label className="admin-label">Description</label>
            <textarea {...register('description')} rows={3} className="admin-input mt-1" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="admin-label">Parent Category</label>
              <select {...register('parentId')} className="admin-input mt-1">
                <option value="">None (Top Level)</option>
                {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className="admin-label">Display Order</label>
              <input type="number" min={0} {...register('sortOrder', { valueAsNumber: true })} className="admin-input mt-1" />
            </div>
          </div>
        </div>
      </form>

      <StickySaveBar
        dirty={dirty}
        saving={loading}
        onSave={() => handleSubmit(onSubmit)()}
        onCancel={() => navigate('/categories')}
        saveLabel="Save changes"
      />
    </PageShell>
  );
}
