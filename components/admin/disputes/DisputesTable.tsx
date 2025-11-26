'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, Eye, AlertTriangle, User, Store } from 'lucide-react';
import { DisputeDetailModal } from './DisputeDetailModal';

type Dispute = {
  id: string;
  order_id: string;
  raised_by_user_id: string;
  raised_by_type: 'buyer' | 'seller';
  dispute_reason: string;
  description: string;
  evidence_urls: string[] | null;
  status: 'open' | 'under_review' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  admin_notes: string | null;
  resolution: string | null;
  admin_action: string | null;
  resolved_by_admin_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  order?: {
    id: string;
    order_number: string;
    total_amount: string;
    payment_method: string;
    order_status: string;
    buyer?: { id: string; full_name: string; email: string; state: string; university?: { name: string } | null };
    seller?: { id: string; business_name: string; full_name: string; email: string; state: string; university?: { name: string } | null };
    product?: { id: string; name: string; image_urls: string[] };
  };
  resolved_by?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
};

interface DisputesTableProps {
  disputes: Dispute[];
  filters?: {
    search?: string;
    status?: string;
    priority?: string;
    raisedBy?: string;
  };
}

export function DisputesTable({ disputes, filters }: DisputesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [localSearch, setLocalSearch] = useState(filters?.search || '');
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const currentStatus = searchParams.get('status') || 'all';
  const currentPriority = searchParams.get('priority') || 'all';
  const currentRaisedBy = searchParams.get('raisedBy') || 'all';

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

  const openDisputeDetails = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setShowDetailModal(true);
  };

  const formatPrice = (price: string | number) => {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numericPrice)) return '₦0.00';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(numericPrice);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      open: 'bg-orange-100 text-orange-700 border-orange-200',
      under_review: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      resolved: 'bg-green-100 text-green-700 border-green-200',
      closed: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return styles[status as keyof typeof styles] || styles.open;
  };

  const getPriorityBadge = (priority: string) => {
    const styles = {
      low: 'bg-blue-100 text-blue-700 border-blue-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      high: 'bg-red-100 text-red-700 border-red-200',
    };
    return styles[priority as keyof typeof styles] || styles.medium;
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      product_not_received: 'Product Not Received',
      wrong_item_received: 'Wrong Item',
      damaged_item: 'Damaged Item',
      fake_counterfeit: 'Fake/Counterfeit',
      seller_not_shipping: 'Seller Not Shipping',
      buyer_not_confirming: 'Buyer Not Confirming',
      payment_issue: 'Payment Issue',
      refund_not_received: 'Refund Not Received',
      other: 'Other',
    };
    return labels[reason] || reason;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={localSearch}
                  onChange={(e) => setLocalSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                  placeholder="Search by order number or description..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <select
                value={currentPriority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="all">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={currentRaisedBy}
                onChange={(e) => handleFilterChange('raisedBy', e.target.value)}
                className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 bg-white"
              >
                <option value="all">All Types</option>
                <option value="buyer">Buyer</option>
                <option value="seller">Seller</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Order & Product
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Raised By
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {disputes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <AlertTriangle className="h-12 w-12 text-gray-300" />
                      <p className="text-gray-500 font-medium">No disputes found</p>
                      <p className="text-sm text-gray-400">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                disputes.map((dispute) => (
                  <tr
                    key={dispute.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => openDisputeDetails(dispute)}
                  >
                    {/* Order & Product */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {dispute.order?.order_number || 'N/A'}
                          </p>
                          <p className="text-sm text-gray-600 truncate">
                            {dispute.order?.product?.name || 'Product'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatPrice(dispute.order?.total_amount || '0')}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Raised By */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {dispute.raised_by_type === 'buyer' ? (
                          <User className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Store className="h-4 w-4 text-purple-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {dispute.raised_by_type}
                          </p>
                          <p className="text-xs text-gray-500">
                            {dispute.raised_by_type === 'buyer'
                              ? dispute.order?.buyer?.full_name
                              : dispute.order?.seller?.business_name || dispute.order?.seller?.full_name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Reason */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{getReasonLabel(dispute.dispute_reason)}</p>
                    </td>

                    {/* Priority */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getPriorityBadge(
                          dispute.priority
                        )}`}
                      >
                        {dispute.priority.toUpperCase()}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                          dispute.status
                        )}`}
                      >
                        {dispute.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>

                    {/* Created */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{formatDate(dispute.created_at)}</p>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDisputeDetails(dispute);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all font-medium text-sm"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Info */}
        {disputes.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{disputes.length}</span> dispute(s)
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedDispute && (
        <DisputeDetailModal
          disputeId={selectedDispute.id}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedDispute(null);
          }}
        />
      )}
    </>
  );
}