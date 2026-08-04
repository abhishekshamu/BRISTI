import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryForm>({
    defaultValues: {
      isActive: true,
      sortOrder: 0,
    },
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
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
      navigate('/categories');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/categories')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Add Category</h2>
            <p className="text-slate-500 dark:text-slate-400">Create a new category</p>
          </div>
        </div>
        <button type="submit" form="category-form" disabled={loading} className="admin-btn-primary py-2.5 px-4 flex items-center">
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save</>}
        </button>
      </div>

      <form id="category-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="admin-card p-6 space-y-4">
          <div>
            <label className="admin-label">Category Name</label>
            <input {...register('name', { required: 'Name is required' })} className="admin-input mt-1" />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="admin-label">Category Slug</label>
            <input {...register('slug')} placeholder="auto-generated from name" className="admin-input mt-1" />
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
              <label className="admin-label">Image URL</label>
              <input {...register('image')} className="admin-input mt-1" />
            </div>
            <div>
              <label className="admin-label">Category Banner URL</label>
              <input {...register('bannerImage')} placeholder="Shown above the title (optional)" className="admin-input mt-1" />
            </div>
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
          <div>
            <label className="admin-label">SEO Title</label>
            <input {...register('seoTitle')} placeholder={`e.g. BRISTI | ${'{Category Name}'}`} className="admin-input mt-1" />
          </div>
          <div>
            <label className="admin-label">SEO Description</label>
            <textarea {...register('seoDescription')} rows={2} className="admin-input mt-1" />
          </div>
          <div className="flex items-center justify-between">
            <label className="admin-label">Status (Active)</label>
            <input type="checkbox" {...register('isActive')} className="w-4 h-4" />
          </div>
        </div>
      </form>
    </div>
  );
}