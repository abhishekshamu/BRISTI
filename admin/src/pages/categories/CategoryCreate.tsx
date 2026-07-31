import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface CategoryForm {
  name: string;
  description?: string;
  image?: string;
  bannerImage?: string;
  parentId?: string;
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
      const response = await api.post('/categories', data);
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
            <label className="admin-label">Name</label>
            <input {...register('name', { required: 'Name is required' })} className="admin-input mt-1" />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="admin-label">Description</label>
            <textarea {...register('description')} rows={3} className="admin-input mt-1" />
          </div>
          <div>
            <label className="admin-label">Image URL</label>
            <input {...register('image')} className="admin-input mt-1" />
          </div>
          <div>
            <label className="admin-label">Banner Image URL</label>
            <input {...register('bannerImage')} className="admin-input mt-1" />
          </div>
          <div>
            <label className="admin-label">Parent Category</label>
            <select {...register('parentId')} className="admin-input mt-1">
              <option value="">None (Top Level)</option>
              {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between">
            <label className="admin-label">Active</label>
            <input type="checkbox" {...register('isActive')} className="w-4 h-4" />
          </div>
        </div>
      </form>
    </div>
  );
}