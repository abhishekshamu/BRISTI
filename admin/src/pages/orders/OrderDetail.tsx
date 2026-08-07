import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, Truck, CheckCircle, XCircle, Clock, Printer, Mail, CreditCard, Send, MapPin, History } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import PageShell from '../../components/ui/PageShell';
import PageSpinner from '../../components/ui/PageSpinner';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

interface OrderItem {
  productId: string;
  variantId?: string;
  productName: string;
  variantName?: string;
  quantity: number;
  price: number;
  total: number;
  sku: string;
  image?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  userId?: string;
  guestEmail?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  billingAddress?: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  notes?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  couponCode?: string;
  couponDiscount?: number;
  statusHistory?: Array<{ status: string; note?: string; changedBy?: string; changedAt: string }>;
  emailHistory?: Array<{ type: 'confirmation' | 'shipping' | 'delivered'; sentAt: string }>;
  createdAt: string;
}

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered', 'cancelled', 'returned', 'refunded'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'];

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [newPaymentStatus, setNewPaymentStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data.data);
      setNewStatus(response.data.data.status);
      setNewPaymentStatus(response.data.data.paymentStatus);
      setTrackingNumber(response.data.data.trackingNumber || '');
      setTrackingUrl(response.data.data.trackingUrl || '');
      setNotes(response.data.data.notes || '');
    } catch (error: any) {
      const msg = error?.response?.data?.message;
      toast.error(msg || 'Failed to fetch order');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      setLoading(true);
      fetchOrder();
    }
  }, [id, fetchOrder]);

  useEffect(() => {
    if (!order) return;
    if (order.userId) {
      api.get(`/users/customers/${order.userId}`).then((res) => {
        setCustomerEmail(res.data.data?.email || null);
      }).catch(() => {});
    } else {
      setCustomerEmail(order.guestEmail || null);
    }
  }, [order]);

  const updateOrderStatus = async () => {
    if (!order || !newStatus) return;
    if (newStatus === order.status) return;
    try {
      setUpdating(true);
      await api.put(`/orders/${id}/status`, { status: newStatus });
      toast.success('Order status updated');
      fetchOrder();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

  const updatePaymentStatus = async () => {
    if (!order || !newPaymentStatus) return;
    if (newPaymentStatus === order.paymentStatus) return;
    try {
      setUpdating(true);
      await api.put(`/orders/${id}/payment-status`, { paymentStatus: newPaymentStatus });
      toast.success('Payment status updated');
      fetchOrder();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update payment status');
    } finally {
      setUpdating(false);
    }
  };

  const saveTracking = async () => {
    if (!order) return;
    try {
      setUpdating(true);
      await api.put(`/orders/${id}/tracking`, {
        trackingNumber: trackingNumber.trim(),
        trackingUrl: trackingUrl.trim() || undefined,
      });
      toast.success('Tracking info saved');
      fetchOrder();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save tracking info');
    } finally {
      setUpdating(false);
    }
  };

  const saveNotes = async () => {
    if (!order) return;
    try {
      setUpdating(true);
      await api.put(`/orders/${id}/notes`, { notes });
      toast.success('Notes saved');
      fetchOrder();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save notes');
    } finally {
      setUpdating(false);
    }
  };

  const cancelOrder = async () => {
    if (!order) return;
    try {
      setUpdating(true);
      await api.put(`/orders/${id}/cancel`, { reason: 'Cancelled by administrator' });
      toast.success('Order cancelled — inventory restored');
      fetchOrder();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to cancel order');
    } finally {
      setUpdating(false);
    }
  };

  const refundOrder = async () => {
    if (!order) return;
    try {
      setUpdating(true);
      await api.put(`/orders/${id}/refund`, { reason: 'Refunded by administrator' });
      toast.success('Order refunded — inventory restored');
      fetchOrder();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to refund order');
    } finally {
      setUpdating(false);
    }
  };

  const sendEmail = async (type: 'confirmation' | 'shipping' | 'delivered') => {
    if (!order) return;
    try {
      setUpdating(true);
      await api.post(`/orders/${id}/send-email`, { type });
      toast.success('Email sent');
      fetchOrder();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to send email');
    } finally {
      setUpdating(false);
    }
  };

  const canCancel = !!order && ['pending', 'confirmed', 'processing'].includes(order.status);
  const canRefund = !!order && !['cancelled', 'refunded'].includes(order.status);
  const isTerminal = !!order && ['cancelled', 'refunded'].includes(order.status);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'shipped':
        return <Truck className="w-5 h-5 text-purple-600" />;
      case 'processing':
        return <Package className="w-5 h-5 text-blue-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'cancelled':
      case 'refunded':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Package className="w-5 h-5 text-slate-600" />;
    }
  };

  const timelineEntries: Array<{ status: string; note?: string; changedBy?: string; changedAt: string }> = (() => {
    if (order?.statusHistory?.length) {
      return order.statusHistory;
    }
    return [{ status: 'pending', changedAt: order?.createdAt || '' }];
  })();

  if (loading) {
    return <PageSpinner label="Loading order…" />;
  }

  if (!order) {
    return (
      <PageShell title="Order Not Found" backTo="/orders">
        <div className="admin-card p-10 text-center">
          <p className="text-slate-500 dark:text-slate-400">Order not found</p>
          <Link to="/orders" className="admin-btn-primary mt-4 py-2 px-4 inline-flex items-center">
            Back to Orders
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`Order #${order.orderNumber}`}
      subtitle={`Placed on ${new Date(order.createdAt).toLocaleString()}`}
      backTo="/orders"
      actions={
        <>
          <button
            onClick={() => window.print()}
            className="admin-btn-secondary py-2.5 px-4 flex items-center"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
          </button>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            disabled={isTerminal}
            className="admin-input"
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={updateOrderStatus}
            disabled={updating || isTerminal}
            className="admin-btn-primary py-2.5 px-4"
          >
            {updating ? 'Updating...' : 'Update Status'}
          </button>
          {canCancel && (
            <button
              onClick={() => setConfirmCancel(true)}
              disabled={updating}
              className="admin-btn-danger py-2.5 px-4"
            >
              Cancel Order
            </button>
          )}
          {canRefund && (
            <button
              onClick={() => setConfirmRefund(true)}
              disabled={updating}
              className="admin-btn-danger py-2.5 px-4"
            >
              Refund Order
            </button>
          )}
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Order Items</h3>
            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-16 h-16 object-cover rounded-md" />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{item.productName}</p>
                      {item.variantName && (
                        <p className="text-sm text-slate-500 dark:text-slate-400">{item.variantName}</p>
                      )}
                      <p className="text-sm text-slate-500 dark:text-slate-400">SKU: {item.sku}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-900 dark:text-slate-100">${item.total?.toLocaleString()}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {item.quantity} x ${item.price?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order totals */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Subtotal</span>
                  <span className="text-slate-900 dark:text-slate-100">${order.subtotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Tax</span>
                  <span className="text-slate-900 dark:text-slate-100">${order.tax?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Shipping</span>
                  <span className="text-slate-900 dark:text-slate-100">${order.shipping?.toLocaleString()}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
                    <span className="text-red-600">-${order.discount?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-900 dark:text-slate-100">Total</span>
                  <span className="text-slate-900 dark:text-slate-100">${order.total?.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Internal Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add internal notes about this order..."
              className="admin-input mt-1"
            />
            <button
              onClick={saveNotes}
              disabled={updating}
              className="admin-btn-primary py-2 px-4 mt-3"
            >
              Save Notes
            </button>
          </div>

          {/* Timeline */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
              <History className="w-4 h-4 mr-2 text-slate-400" />
              Timeline
            </h3>
            <div className="space-y-4">
              {timelineEntries.map((entry, idx) => (
                <div key={idx} className="flex items-start space-x-3">
                  <div className="mt-0.5">{getStatusIcon(entry.status)}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium capitalize text-slate-900 dark:text-slate-100">
                      {entry.status}
                      {entry.status === 'pending' && idx === 0 && <span className="ml-2 text-xs font-normal text-slate-400">(placed)</span>}
                    </p>
                    {entry.note && <p className="text-sm text-slate-500 dark:text-slate-400">{entry.note}</p>}
                    <p className="text-xs text-slate-400">
                      {new Date(entry.changedAt).toLocaleString()}
                      {entry.changedBy && <span className="ml-2">by {entry.changedBy}</span>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Order Status</h3>
            <div className="flex items-center space-x-3">
              {getStatusIcon(order.status)}
              <span className="text-lg font-medium capitalize text-slate-900 dark:text-slate-100">
                {order.status}
              </span>
            </div>
          </div>

          {/* Customer info */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Customer</h3>
            <div className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </p>
              <p>{customerEmail || order.guestEmail || 'No email on file'}</p>
              <p>{order.shippingAddress.phone}</p>
              {order.userId && (
                <p className="text-slate-500">
                  <Link to="/customers" className="text-blue-600 hover:underline">View customer</Link> · ID: {order.userId}
                </p>
              )}
            </div>
          </div>

          {/* Shipping address */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
              <Truck className="w-4 h-4 mr-2 text-slate-400" />
              Shipping Address
            </h3>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
              <p>{order.shippingAddress.country}</p>
              <p>{order.shippingAddress.phone}</p>
            </div>
          </div>

          {/* Billing address */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
              <MapPin className="w-4 h-4 mr-2 text-slate-400" />
              Billing Address
            </h3>
            {order.billingAddress ? (
              <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                <p>{order.billingAddress.firstName} {order.billingAddress.lastName}</p>
                <p>{order.billingAddress.addressLine1}</p>
                {order.billingAddress.addressLine2 && <p>{order.billingAddress.addressLine2}</p>}
                <p>{order.billingAddress.city}, {order.billingAddress.state} {order.billingAddress.postalCode}</p>
                <p>{order.billingAddress.country}</p>
                <p>{order.billingAddress.phone}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Same as shipping address</p>
            )}
          </div>

          {/* Payment info */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
              <CreditCard className="w-4 h-4 mr-2 text-slate-400" />
              Payment
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Method</span>
                <span className="text-slate-900 dark:text-slate-100 capitalize">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Status</span>
                <span className={`capitalize font-medium ${
                  order.paymentStatus === 'paid' ? 'text-green-600' :
                  order.paymentStatus === 'pending' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {order.paymentStatus}
                </span>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <select
                  value={newPaymentStatus}
                  onChange={(e) => setNewPaymentStatus(e.target.value)}
                  className="admin-input w-full"
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                <button
                  onClick={updatePaymentStatus}
                  disabled={updating}
                  className="admin-btn-primary py-2 px-4 mt-2 w-full"
                >
                  Update Payment Status
                </button>
              </div>
            </div>
          </div>

          {/* Tracking */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
              <Truck className="w-4 h-4 mr-2 text-slate-400" />
              Tracking
            </h3>
            <div className="space-y-2">
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="Tracking number"
                className="admin-input"
              />
              <input
                type="text"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="Tracking URL (optional)"
                className="admin-input"
              />
              <button
                onClick={saveTracking}
                disabled={updating}
                className="admin-btn-primary py-2 px-4 w-full"
              >
                Save Tracking
              </button>
              {order.trackingNumber && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Current: {order.trackingNumber}
                  {order.trackingUrl && (
                    <>
                      {' · '}
                      <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        Track Package
                      </a>
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Emails */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
              <Mail className="w-4 h-4 mr-2 text-slate-400" />
              Customer Emails
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => sendEmail('confirmation')}
                disabled={updating}
                className="admin-btn-secondary py-2 px-4 flex items-center justify-center text-sm"
              >
                <Send className="w-3.5 h-3.5 mr-2" />
                Send Confirmation Email
              </button>
              <button
                onClick={() => sendEmail('shipping')}
                disabled={updating}
                className="admin-btn-secondary py-2 px-4 flex items-center justify-center text-sm"
              >
                <Send className="w-3.5 h-3.5 mr-2" />
                Send Shipping Email
              </button>
              <button
                onClick={() => sendEmail('delivered')}
                disabled={updating}
                className="admin-btn-secondary py-2 px-4 flex items-center justify-center text-sm"
              >
                <Send className="w-3.5 h-3.5 mr-2" />
                Send Delivered Email
              </button>
            </div>
            {!!order.emailHistory?.length && (
              <div className="mt-3 space-y-1">
                {order.emailHistory.map((e, idx) => (
                  <p key={idx} className="text-xs text-slate-500 dark:text-slate-400">
                    {e.type} email sent {new Date(e.sentAt).toLocaleString()}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Printable invoice */}
      <div className="invoice-print hidden">
        <h1>BRISTI — Invoice</h1>
        <p>Order #{order.orderNumber}</p>
        <p>Placed: {new Date(order.createdAt).toLocaleString()}</p>
        <p>Customer: {order.shippingAddress.firstName} {order.shippingAddress.lastName} ({customerEmail || order.guestEmail || 'no email'})</p>
        <p>Ship to: {order.shippingAddress.addressLine1}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}, {order.shippingAddress.country}</p>
        <table>
          <thead>
            <tr><th>Item</th><th>Variant</th><th>SKU</th><th>Qty</th><th>Price</th><th>Total</th></tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={idx}>
                <td>{item.productName}</td>
                <td>{item.variantName || '—'}</td>
                <td>{item.sku}</td>
                <td>{item.quantity}</td>
                <td>${item.price}</td>
                <td>${item.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>Subtotal: ${order.subtotal} | Tax: ${order.tax} | Shipping: ${order.shipping} | Discount: -${order.discount}{order.couponCode ? ` (${order.couponCode})` : ''}</p>
        <p><strong>Total: ${order.total}</strong></p>
        <p>Payment: {order.paymentMethod} ({order.paymentStatus})</p>
        <p>Order status: {order.status}</p>
        {order.trackingNumber && <p>Tracking: {order.trackingNumber}</p>}
        <p>Generated: {new Date().toLocaleString()}</p>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel order"
        body={`Cancel ${order.orderNumber}? Inventory will be restored automatically.`}
        confirmLabel="Cancel order"
        tone="danger"
        onConfirm={async () => {
          await cancelOrder();
          setConfirmCancel(false);
        }}
        onCancel={() => setConfirmCancel(false)}
      />
      <ConfirmDialog
        open={confirmRefund}
        title="Refund order"
        body={`Refund ${order.orderNumber}? Inventory will be restored and payment marked as refunded.`}
        confirmLabel="Refund order"
        tone="danger"
        onConfirm={async () => {
          await refundOrder();
          setConfirmRefund(false);
        }}
        onCancel={() => setConfirmRefund(false)}
      />
    </PageShell>
  );
}
