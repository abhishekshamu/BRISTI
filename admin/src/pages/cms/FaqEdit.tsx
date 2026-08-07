import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import FormSection from '../../components/ui/FormSection';
import StickySaveBar from '../../components/ui/StickySaveBar';
import PageSpinner from '../../components/ui/PageSpinner';
import { useUnsavedChanges } from '../../lib/unsaved-context';

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
  const { dirty, setDirty } = useUnsavedChanges();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FaqForm>();

  useEffect(() => {
    setDirty(isDirty);
  }, [isDirty, setDirty]);

  const fetchFaq = useCallback(async () => {
    try {
      const response = await api.get(`/faqs/${id}`);
      reset(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch FAQ');
      navigate('/faqs');
    } finally {
      setLoading(false);
    }
  }, [id, reset, navigate]);

  useEffect(() => {
    if (id) {
      fetchFaq();
    }
  }, [id, fetchFaq]);

  const onSubmit = async (data: FaqForm) => {
    try {
      setSaving(true);
      await api.put(`/faqs/${id}`, data);
      toast.success('FAQ updated successfully');
      reset(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update FAQ');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSpinner label="Loading FAQ" />;
  }

  return (
    <PageShell
      title="Edit FAQ"
      subtitle="Update FAQ information"
      breadcrumbs={[{ label: 'FAQs', to: '/faqs' }]}
      backTo="/faqs"
    >
      <form id="faq-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
        <FormSection number={1} title="Question & Answer" description="Shown in the storefront FAQ section.">
          <div className="admin-field">
            <label className="admin-label">Question</label>
            <input {...register('question', { required: 'Question is required' })} className="admin-input" />
            {errors.question && <p className="text-xs text-red-600">{errors.question.message}</p>}
          </div>
          <div className="admin-field">
            <label className="admin-label">Answer</label>
            <textarea {...register('answer', { required: 'Answer is required' })} rows={5} className="admin-input" />
            {errors.answer && <p className="text-xs text-red-600">{errors.answer.message}</p>}
          </div>
        </FormSection>
        <FormSection number={2} title="Organization" description="Grouping and ordering controls.">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="admin-field">
              <label className="admin-label">Category</label>
              <input {...register('category', { required: 'Category is required' })} className="admin-input" />
              {errors.category && <p className="text-xs text-red-600">{errors.category.message}</p>}
            </div>
            <div className="admin-field">
              <label className="admin-label">Sort Order</label>
              <input type="number" {...register('sortOrder', { valueAsNumber: true })} className="admin-input" />
            </div>
          </div>
          <div className="flex items-center justify-between admin-card px-4 py-3.5 rounded-lg">
            <label className="admin-label">Active</label>
            <input type="checkbox" {...register('isActive')} className="w-4 h-4" />
          </div>
        </FormSection>
      </form>
      <StickySaveBar
        dirty={dirty}
        saving={saving}
        onSave={() => handleSubmit(onSubmit)()}
        onCancel={() => navigate('/faqs')}
        saveLabel="Save Changes"
      />
    </PageShell>
  );
}