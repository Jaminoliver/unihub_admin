'use client';

import { useState, useTransition } from 'react';
import { X, DollarSign, Ban, RefreshCw, Package, User, Store, Calendar, CreditCard } from 'lucide-react';
import { releaseEscrow, refundOrder, cancelOrder } from '@/app/admin/dashboard/orders/actions';

type Order = {
  id: string;
  order_number: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: string;
  unit_price: string;
  total_amount: string;
  payment_method: string;
  payment_status: string;
  order_status: string;
  delivery_code: string | null;
  delivery_confirmed_at: string | null;
  escrow_amount: string;
  escrow_released: boolean;
  commission_amount: string;
  seller_payout_amount: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  buyer?: { id: string; full_name: string; email: string; phone_number?: string; state: string; university?: { name: string } | null };
  seller?: { id: string; business_name: string; full_name: string; email: string; phone_number?: string; state: string; university?: { name: string } | null };
  product?: { id: string; name: string; image_urls: string[]; condition?: string; brand?: string };
};

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
  onAction: () => void;
}

export function OrderDetailModal({ order, onClose, onAction }: OrderDetailModalProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionType, setActionType] = useState<'release' | 'refund' | 'cancel' | null>(null);
  const [reason, setReason] = useState('');

  const formatPrice = (price: string | number) => {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numericPrice)) return '₦0.00';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(numericPrice);
  };

  const getFirstImage = (imageUrls: string[] | string | null) => {
    if (!imageUrls) return null;
    try {
      const parsed = typeof imageUrls === 'string' ? JSON.parse(imageUrls) : imageUrls;
      return Array.isArray(parsed) && parsed[0] ? parsed[0] : null;
    } catch {
      return null;
    }
  };

  const handleAction = async () => {
    if (!actionType) return;

    if ((actionType === 'refund' || actionType === 'cancel') && !reason.trim()) {
      alert('Please provide a reason');
      return;
    }

    startTransition(async () => {
      let result;
      if (actionType === 'release') {
        result = await releaseEscrow(order.id);
      } else if (actionType === 'refund') {
        result = await refundOrder(order.id, reason);
      } else if (actionType === 'cancel') {
        result = await cancelOrder(order.id, reason);
      }

      if (result?.success) {
        setShowConfirmModal(false);
        setReason('');
        onAction();
      } else {
        alert(`Error: ${result?.error}`);
      }
    });
  };

  const openConfirmModal = (type: 'release' | 'refund' | 'cancel') => {
    setActionType(type);
    setShowConfirmModal(true);
  };

  const canReleaseEscrow = parseFloat(order.escrow_amount) > 0 && !order.escrow_released;
  const canRefund = order.order_status !== 'refunded' && order.order_status !== 'cancelled';
  const canCancel = order.order_status === 'pending' || order.order_status === 'paid';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Order Details</h3>
              <p className="text-sm text-gray-500 mt-1">{order.order_number}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Product Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Information
              </h4>
              <div className="flex items-start gap-4">
                {getFirstImage(order.product?.image_urls || null) ? (
                  <img
                    src={getFirstImage(order.product?.image_urls || null)!}
                    alt={order.product?.name}
                    className="h-24 w-24 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="h-24 w-24 bg-gray-200 rounded-lg flex items-center justify-center">
                    <span className="text-xs text-gray-400">No Image</span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-lg">{order.product?.name || 'N/A'}</p>
                  {order.product?.brand && <p className="text-sm text-gray-600">Brand: {order.product.brand}</p>}
                  {order.product?.condition && (
                    <p className="text-sm text-gray-600 capitalize">Condition: {order.product.condition}</p>
                  )}
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="text-gray-600">Quantity: <span className="font-medium">{order.quantity}</span></span>
                    <span className="text-gray-600">Unit Price: <span className="font-medium">{formatPrice(order.unit_price)}</span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Status & Payment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment Details
                </h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Method:</dt>
                    <dd className="font-medium capitalize">{order.payment_method}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Status:</dt>
                    <dd className="font-medium capitalize">{order.payment_status}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Total Amount:</dt>
                    <dd className="font-semibold text-lg">{formatPrice(order.total_amount)}</dd>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <dt className="text-gray-600">Commission (5%):</dt>
                    <dd className="font-medium text-green-600">{formatPrice(order.commission_amount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Seller Payout:</dt>
                    <dd className="font-medium">{formatPrice(order.seller_payout_amount)}</dd>
                  </div>
                </dl>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Escrow Status
                </h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Escrow Amount:</dt>
                    <dd className="font-semibold text-lg">{formatPrice(order.escrow_amount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Status:</dt>
                    <dd className={`font-medium ${order.escrow_released ? 'text-green-600' : 'text-orange-600'}`}>
                      {order.escrow_released ? 'Released' : parseFloat(order.escrow_amount) > 0 ? 'Held' : 'N/A'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Order Status:</dt>
                    <dd className="font-medium capitalize">{order.order_status}</dd>
                  </div>
                  {order.delivery_code && (
                    <div className="flex justify-between border-t pt-2">
                      <dt className="text-gray-600">Delivery Code:</dt>
                      <dd className="font-mono font-bold text-blue-600">{order.delivery_code}</dd>
                    </div>
                  )}
                  {order.delivery_confirmed_at && (
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Delivered At:</dt>
                      <dd className="text-xs">{new Date(order.delivery_confirmed_at).toLocaleString()}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Buyer & Seller Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Buyer Information
                </h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-600">Name:</dt>
                    <dd className="font-medium">{order.buyer?.full_name || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Email:</dt>
                    <dd className="text-blue-600">{order.buyer?.email || 'N/A'}</dd>
                  </div>
                  {order.buyer?.phone_number && (
                    <div>
                      <dt className="text-gray-600">Phone:</dt>
                      <dd>{order.buyer.phone_number}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-gray-600">State:</dt>
                    <dd>{order.buyer?.state || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">University:</dt>
                    <dd>{order.buyer?.university?.name || 'N/A'}</dd>
                  </div>
                </dl>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Store className="h-5 w-5" />
                  Seller Information
                </h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-600">Business Name:</dt>
                    <dd className="font-medium">{order.seller?.business_name || order.seller?.full_name || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">Email:</dt>
                    <dd className="text-blue-600">{order.seller?.email || 'N/A'}</dd>
                  </div>
                  {order.seller?.phone_number && (
                    <div>
                      <dt className="text-gray-600">Phone:</dt>
                      <dd>{order.seller.phone_number}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-gray-600">State:</dt>
                    <dd>{order.seller?.state || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">University:</dt>
                    <dd>{order.seller?.university?.name || 'N/A'}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Timestamps */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline
              </h4>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-600">Created:</dt>
                  <dd className="font-medium">{new Date(order.created_at).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-gray-600">Last Updated:</dt>
                  <dd className="font-medium">{new Date(order.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Admin Notes</h4>
                <p className="text-sm text-gray-700">{order.notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">
                Close
              </button>
              {canReleaseEscrow && (
                <button
                  onClick={() => openConfirmModal('release')}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                >
                  <DollarSign className="h-4 w-4" />
                  Release Escrow
                </button>
              )}
              {canRefund && (
                <button
                  onClick={() => openConfirmModal('refund')}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refund Order
                </button>
              )}
              {canCancel && (
                <button
                  onClick={() => openConfirmModal('cancel')}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                >
                  <Ban className="h-4 w-4" />
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Action Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {actionType === 'release' && 'Release Escrow Funds'}
              {actionType === 'refund' && 'Refund Order'}
              {actionType === 'cancel' && 'Cancel Order'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {actionType === 'release' && `Release ${formatPrice(order.escrow_amount)} to seller's wallet?`}
              {actionType === 'refund' && 'This will refund the buyer and mark the order as refunded.'}
              {actionType === 'cancel' && 'This will cancel the order and notify both buyer and seller.'}
            </p>
            {(actionType === 'refund' || actionType === 'cancel') && (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason (required)..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                rows={3}
              />
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAction}
                disabled={isPending || ((actionType === 'refund' || actionType === 'cancel') && !reason.trim())}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {isPending ? 'Processing...' : 'Confirm'}
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setReason('');
                }}
                disabled={isPending}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}