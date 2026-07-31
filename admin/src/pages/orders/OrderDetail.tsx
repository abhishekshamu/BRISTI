import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Package, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

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
  notes?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  couponCode?: string;
  createdAt: string;
}

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    if (id) {
      fetchOrder();
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${id}`);
      setOrder(response.data.data);
      setNewStatus(response.data.data.status);
    } catch (error) {
      toast.error('Failed to fetch order');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async () => {
    if (!order || !newStatus) return;
    
    try {
      setUpdating(true);
      await api.put(`/orders/${id}/status`, { status: newStatus });
      toast.success('Order status updated');
      fetchOrder();
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setUpdating(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">Order not found</p>
        <Link to="/orders" className="admin-btn-primary mt-4 py-2 px-4 inline-flex items-center">
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/orders"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Order #{order.orderNumber}
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Placed on {new Date(order.createdAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="admin-input"
          >
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
          <button
            onClick={updateOrderStatus}
            disabled={updating}
            className="admin-btn-primary py-2.5 px-4"
          >
            {updating ? 'Updating...' : 'Update Status'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Order Items</h3>
            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-md flex items-center justify-center">
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
                    <span className="text-slate-500 dark:text-slate-400">Discount</span>
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
            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {order.guestEmail || 'Guest Customer'}
              </p>
              {order.userId && (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  User ID: {order.userId}
                </p>
              )}
            </div>
          </div>

          {/* Shipping address */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Shipping Address</h3>
            <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
              <p>{order.shippingAddress.addressLine1}</p>
              {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
              <p>{order.shippingAddress.country}</p>
              <p>{order.shippingAddress.phone}</p>
            </div>
          </div>

          {/* Payment info */}
          <div className="admin-card p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Payment</h3>
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
            </div>
          </div>

          {/* Tracking */}
          {order.trackingNumber && (
            <div className="admin-card p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Tracking</h3>
              <div className="space-y-2">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Tracking: {order.trackingNumber}
                </p>
                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Track Package
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}