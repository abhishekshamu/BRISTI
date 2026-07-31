import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface FaqForm {
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

export default function FaqEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FaqForm>();

  useEffect(() => {
    if (id) {
      fetchFaq();
    }
  }, [id]);

  const fetchFaq = async () => {
    try {
      const response = await api.get(`/faqs/${id}`);
      reset(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch FAQ');
      navigate('/faqs');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: FaqForm) => {
    try {
      setSaving(true);
      await api.put(`/faqs/${id}`, data);
      toast.success('FAQ updated successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update FAQ');
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button onClick={() => navigate('/faqs')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Edit FAQ</h2>
            <p className="text-slate-500 dark:text-slate-400">Update FAQ information</p>
          </div>
        </div>
        <button type="submit" form="faq-form" disabled={saving} className="admin-btn-primary py-2.5 px-4 flex items-center">
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
        </button>
      </div>

      <form id="faq-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="admin-card p-6 space-y-4">
          <div>
            <label className="admin-label">Question</label>
            <input {...register('question', { required: 'Question is required' })} className="admin-input mt-1" />
            {errors.question && <p className="mt-1 text-sm text-red-600">{errors.question.message}</p>}
          </div>
          <div>
            <label className="admin-label">Answer</label>
            <textarea {...register('answer', { required: 'Answer is required' })} rows={4} className="admin-input mt-1" />
            {errors.answer && <p className="mt-1 text-sm text-red-600">{errors.answer.message}</p>}
          </div>
          <div>
            <label className="admin-label">Category</label>
            <input {...register('category', { required: 'Category is required' })} className="admin-input mt-1" />
            {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>}
          </div>
          <div>
            <label className="admin-label">Sort Order</label>
            <input type="number" {...register('sortOrder', { valueAsNumber: true })} className="admin-input mt-1" />
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