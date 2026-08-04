import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CouponForm>();

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
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update coupon');
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
          <button onClick={() => navigate('/coupons')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Edit Coupon</h2>
            <p className="text-slate-500 dark:text-slate-400">Update coupon information</p>
          </div>
        </div>
        <button type="submit" form="coupon-form" disabled={saving} className="admin-btn-primary py-2.5 px-4 flex items-center">
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
        </button>
      </div>

      <form id="coupon-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="admin-card p-6 space-y-4">
          <div>
            <label className="admin-label">Coupon Code</label>
            <input {...register('code', { required: 'Code is required' })} className="admin-input mt-1" />
            {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>}
          </div>
          <div>
            <label className="admin-label">Name</label>
            <input {...register('name', { required: 'Name is required' })} className="admin-input mt-1" />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="admin-label">Description</label>
            <textarea {...register('description')} rows={2} className="admin-input mt-1" />
          </div>
          <div>
            <label className="admin-label">Type</label>
            <select {...register('type')} className="admin-input mt-1">
              <option value="percentage">Percentage</option>
              <option value="fixed_amount">Fixed Amount</option>
              <option value="free_shipping">Free Shipping</option>
              <option value="bogo">Buy One Get One</option>
            </select>
          </div>
          <div>
            <label className="admin-label">Value</label>
            <input type="number" {...register('value', { required: 'Value is required', min: 0 })} className="admin-input mt-1" />
            {errors.value && <p className="mt-1 text-sm text-red-600">{errors.value.message}</p>}
          </div>
          <div>
            <label className="admin-label">Minimum Purchase ($)</label>
            <input type="number" {...register('minimumPurchase', { min: 0 })} className="admin-input mt-1" />
          </div>
          <div>
            <label className="admin-label">Usage Limit</label>
            <input type="number" {...register('usageLimit', { required: true, min: 1 })} className="admin-input mt-1" />
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