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

interface CouponForm {
  code: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'bogo';
  value: number;
  minimumPurchase?: number;
  maximumDiscount?: number;
  usageLimit: number;
  perCustomerLimit?: number;
  appliesTo: 'all' | 'specific_products' | 'specific_categories' | 'specific_collections';
  appliesToSaleItems: boolean;
  isActive: boolean;
  startsAt?: string;
  expiresAt?: string;
}

export default function CouponEdit() {
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
  } = useForm<CouponForm>();

  useEffect(() => {
    setDirty(isDirty);
  }, [isDirty, setDirty]);

  const fetchCoupon = useCallback(async () => {
    try {
      const response = await api.get(`/coupons/${id}`);
      reset(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch coupon');
      navigate('/coupons');
    } finally {
      setLoading(false);
    }
  }, [id, reset, navigate]);

  useEffect(() => {
    if (id) {
      fetchCoupon();
    }
  }, [id, fetchCoupon]);

  const onSubmit = async (data: CouponForm) => {
    try {
      setSaving(true);
      await api.put(`/coupons/${id}`, data);
      toast.success('Coupon updated successfully');
      reset(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update coupon');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <PageSpinner label="Loading coupon" />;
  }

  return (
    <PageShell
      title="Edit Coupon"
      subtitle="Update coupon information"
      breadcrumbs={[{ label: 'Coupons', to: '/coupons' }]}
      backTo="/coupons"
    >
      <form id="coupon-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
        <FormSection number={1} title="Details" description="How the coupon is identified at checkout.">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="admin-field">
              <label className="admin-label">Coupon Code</label>
              <input {...register('code', { required: 'Code is required' })} className="admin-input uppercase" />
              {errors.code && <p className="text-xs text-red-600">{errors.code.message}</p>}
            </div>
            <div className="admin-field">
              <label className="admin-label">Name</label>
              <input {...register('name', { required: 'Name is required' })} className="admin-input" />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="sm:col-span-2 admin-field">
              <label className="admin-label">Description</label>
              <textarea {...register('description')} rows={2} className="admin-input" />
            </div>
          </div>
        </FormSection>

        <FormSection number={2} title="Discount" description="Type and value of the discount applied.">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="admin-field">
              <label className="admin-label">Type</label>
              <select {...register('type')} className="admin-input">
                <option value="percentage">Percentage</option>
                <option value="fixed_amount">Fixed Amount</option>
                <option value="free_shipping">Free Shipping</option>
                <option value="bogo">Buy One Get One</option>
              </select>
            </div>
            <div className="admin-field">
              <label className="admin-label">Value</label>
              <input type="number" {...register('value', { required: 'Value is required', min: 0 })} className="admin-input" />
              {errors.value && <p className="text-xs text-red-600">{errors.value.message}</p>}
            </div>
            <div className="admin-field">
              <label className="admin-label">Minimum Purchase ($)</label>
              <input type="number" {...register('minimumPurchase', { min: 0 })} className="admin-input" />
            </div>
            <div className="admin-field">
              <label className="admin-label">Usage Limit</label>
              <input type="number" {...register('usageLimit', { required: true, min: 1 })} className="admin-input" />
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
        onCancel={() => navigate('/coupons')}
        saveLabel="Save Changes"
      />
    </PageShell>
  );
}