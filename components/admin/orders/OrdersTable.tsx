'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, Eye, DollarSign, XCircle } from 'lucide-react';
import { OrderDetailModal } from './OrderDetailModal';

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
  buyer?: { id: string; full_name: string; email: string; state: string; university?: { name: string } | null };
  seller?: { id: string; business_name: string; full_name: string; email: string; state: string; university?: { name: string } | null };
  product?: { id: string; name: string; image_urls: string[] };
};

type Seller = {
  id: string;
  business_name: string | null;
  full_name: string | null;
  email: string;
};

interface OrdersTableProps {
  orders: Order[];
  sellers: Seller[];
  filters?: {
    search?: string;
    status?: string;
    paymentMethod?: string;
    seller?: string;
  };
}

export function OrdersTable({ orders, sellers, filters }: OrdersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [localSearch, setLocalSearch] = useState(filters?.search || '');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const currentStatus = searchParams.get('status') || 'all';
  const currentPaymentMethod = searchParams.get('paymentMethod') || 'all';
  const currentSeller = searchParams.get('seller') || 'all';

  const handleSearchSubmit = () => {
    const params = new URLSearchParams(searchParams);
    if (localSearch.trim()) params.set('search', localSearch.trim());
    else params.delete('search');
    router.push(`?${params.toString()}`);
  };

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value !== 'all') params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

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

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      paid: 'bg-blue-100 text-blue-800 border-blue-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      completed: 'bg-purple-100 text-purple-800 border-purple-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
      refunded: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentBadge = (method: string) => {
    const badges = {
      full: { label: 'Full Payment', class: 'bg-green-100 text-green-800' },
      half: { label: 'Half Payment', class: 'bg-orange-100 text-orange-800' },
      pod: { label: 'Pay on Delivery', class: 'bg-blue-100 text-blue-800' },
    };
    const badge = badges[method as keyof typeof badges] || { label: method, class: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.class}`}>{badge.label}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search order number..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              onBlur={handleSearchSubmit}
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>

          {/* Payment Method Filter */}
          <select
            value={currentPaymentMethod}
            onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Payment Types</option>
            <option value="full">Full Payment</option>
            <option value="half">Half Payment</option>
            <option value="pod">Pay on Delivery</option>
          </select>

          {/* Status Filter */}
          <select
            value={currentStatus}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Seller Filter */}
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
            <select
              value={currentSeller}
              onChange={(e) => handleFilterChange('seller', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All Sellers</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.business_name || seller.full_name || seller.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Buyer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Seller</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Escrow</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No orders found matching your filters
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => openOrderDetails(order)}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{order.order_number}</p>
                        <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getFirstImage(order.product?.image_urls || null) ? (
                          <img src={getFirstImage(order.product?.image_urls || null)!} alt={order.product?.name} className="h-10 w-10 rounded object-cover border" />
                        ) : (
                          <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                            <span className="text-xs text-gray-400">N/A</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{order.product?.name || 'N/A'}</p>
                          <p className="text-xs text-gray-500">Qty: {order.quantity}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{order.buyer?.full_name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{order.buyer?.university?.name || order.buyer?.state || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{order.seller?.business_name || order.seller?.full_name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{order.seller?.university?.name || order.seller?.state || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{formatPrice(order.total_amount)}</p>
                        <p className="text-xs text-green-600">Commission: {formatPrice(order.commission_amount)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getPaymentBadge(order.payment_method)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(order.order_status)}`}>
                        {order.order_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <p className="font-medium text-gray-900">{formatPrice(order.escrow_amount)}</p>
                        {order.escrow_released ? (
                          <span className="text-green-600">Released</span>
                        ) : parseFloat(order.escrow_amount) > 0 ? (
                          <span className="text-orange-600">Held</span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openOrderDetails(order);
                        }}
                        className="p-2 hover:bg-blue-100 rounded-full text-blue-600"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && showDetailModal && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setShowDetailModal(false)}
          onAction={() => {
            router.refresh();
            setShowDetailModal(false);
          }}
        />
      )}
    </div>
  );
}