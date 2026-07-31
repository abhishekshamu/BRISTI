import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface CollectionForm {
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  image?: string;
  bannerImage?: string;
  featured: boolean;
  isActive: boolean;
}

export default function CollectionCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CollectionForm>({
    defaultValues: {
      featured: false,
      isActive: true,
    },
  });

  const onSubmit = async (data: CollectionForm) => {
    try {
      setLoading(true);
      const response = await api.post('/collections', data);
      toast.success('Collection created successfully');
      navigate('/collections');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create collection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/collections')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Add Collection</h2>
            <p className="text-slate-500 dark:text-slate-400">Create a new collection</p>
          </div>
        </div>
        <button type="submit" form="collection-form" disabled={loading} className="admin-btn-primary py-2.5 px-4 flex items-center">
          {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save</>}
        </button>
      </div>

      <form id="collection-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="admin-card p-6 space-y-4">
          <div>
            <label className="admin-label">Name</label>
            <input {...register('name', { required: 'Name is required' })} className="admin-input mt-1" />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="admin-label">Slug</label>
            <input {...register('slug', { required: 'Slug is required' })} className="admin-input mt-1" />
            {errors.slug && <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>}
          </div>
          <div>
            <label className="admin-label">Description</label>
            <textarea {...register('description')} rows={3} className="admin-input mt-1" />
          </div>
          <div>
            <label className="admin-label">Short Description</label>
            <textarea {...register('shortDescription')} rows={2} className="admin-input mt-1" />
          </div>
          <div>
            <label className="admin-label">Image URL</label>
            <input {...register('image')} className="admin-input mt-1" />
          </div>
          <div>
            <label className="admin-label">Banner Image URL</label>
            <input {...register('bannerImage')} className="admin-input mt-1" />
          </div>
          <div className="flex items-center justify-between">
            <label className="admin-label">Featured</label>
            <input type="checkbox" {...register('featured')} className="w-4 h-4" />
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