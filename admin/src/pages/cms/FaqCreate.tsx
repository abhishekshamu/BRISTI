import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import StickySaveBar from '../../components/ui/StickySaveBar';
import { useUnsavedChanges } from '../../lib/unsaved-context';

interface FaqForm {
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

export default function FaqCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { dirty, setDirty } = useUnsavedChanges();

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FaqForm>({
    defaultValues: {
      isActive: true,
      sortOrder: 0,
    },
  });

  useEffect(() => {
    setDirty(isDirty);
  }, [isDirty, setDirty]);

  const onSubmit = async (data: FaqForm) => {
    try {
      setLoading(true);
      await api.post('/faqs', data);
      toast.success('FAQ created successfully');
      navigate('/faqs');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create FAQ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageShell
      title="Add FAQ"
      subtitle="Create a new FAQ"
      breadcrumbs={[{ label: 'FAQs', to: '/faqs' }]}
      backTo="/faqs"
    >
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
      <StickySaveBar
        dirty={dirty}
        saving={loading}
        onSave={() => handleSubmit(onSubmit)()}
        onCancel={() => navigate('/faqs')}
        saveLabel="Save FAQ"
      />
    </PageShell>
  );
}