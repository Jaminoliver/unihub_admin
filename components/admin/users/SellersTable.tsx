'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, Eye, CheckCircle, XCircle, Ban, Shield } from 'lucide-react';
import { approveSeller, rejectSeller, massApproveSellers, banUser, unbanUser } from '@/app/admin/dashboard/users/actions';

type Seller = {
  id: string;
  user_id: string;
  business_name: string | null;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  state: string | null;
  bank_verified: boolean;
  approval_status: string;
  account_status: string;
  wallet_balance: string;
  created_at: string;
  products_count?: number;
  orders_count?: number;
  university?: { name: string; state: string } | null;
};

interface SellersTableProps {
  sellers: Seller[];
  universities: { id: string; name: string }[];
  states: string[];
  onViewDetails: (seller: Seller) => void;
}

export function SellersTable({ sellers, universities, states, onViewDetails }: SellersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [localSearch, setLocalSearch] = useState('');
  const [selectedSellers, setSelectedSellers] = useState<string[]>([]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'ban' | null>(null);
  const [reason, setReason] = useState('');
  const [currentSellerId, setCurrentSellerId] = useState<string | null>(null);

  const currentState = searchParams.get('state') || 'all';
  const currentUniversity = searchParams.get('university') || 'all';
  const currentApprovalStatus = searchParams.get('approvalStatus') || 'all';

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

  const toggleSelectSeller = (sellerId: string) => {
    setSelectedSellers(prev =>
      prev.includes(sellerId) ? prev.filter(id => id !== sellerId) : [...prev, sellerId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSellers.length === sellers.length) {
      setSelectedSellers([]);
    } else {
      setSelectedSellers(sellers.map(s => s.id));
    }
  };

  const openActionModal = (type: 'approve' | 'reject' | 'ban', sellerId?: string) => {
    setActionType(type);
    setCurrentSellerId(sellerId || null);
    setShowActionModal(true);
  };

  const handleAction = async () => {
    if ((actionType === 'reject' || actionType === 'ban') && !reason.trim()) {
      alert('Please provide a reason');
      return;
    }

    startTransition(async () => {
      let result;

      if (actionType === 'approve') {
        if (currentSellerId) {
          result = await approveSeller(currentSellerId);
        } else {
          result = await massApproveSellers(selectedSellers);
        }
      } else if (actionType === 'reject' && currentSellerId) {
        result = await rejectSeller(currentSellerId, reason);
      } else if (actionType === 'ban' && currentSellerId) {
        result = await banUser(currentSellerId, 'seller', reason);
      }

      if (result?.success) {
        setShowActionModal(false);
        setReason('');
        setCurrentSellerId(null);
        setSelectedSellers([]);
        router.refresh();
      } else {
        alert(`Error: ${result?.error}`);
      }
    });
  };

  const getApprovalBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const getAccountBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      banned: 'bg-red-100 text-red-800',
      suspended: 'bg-orange-100 text-orange-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(parseFloat(price));
  };

  // Format date consistently to avoid hydration mismatch
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 flex-1">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search sellers..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              onBlur={handleSearchSubmit}
              className="flex-1 outline-none text-sm bg-transparent"
            />
          </div>

          {selectedSellers.length > 0 && (
            <button
              onClick={() => openActionModal('approve')}
              disabled={isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              Approve Selected ({selectedSellers.length})
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={currentApprovalStatus}
            onChange={(e) => handleFilterChange('approvalStatus', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Approval Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <select
            value={currentState}
            onChange={(e) => handleFilterChange('state', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All States</option>
            {states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>

          <select
            value={currentUniversity}
            onChange={(e) => handleFilterChange('university', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Universities</option>
            {universities.map(uni => (
              <option key={uni.id} value={uni.id}>{uni.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedSellers.length === sellers.length && sellers.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Business</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Approval</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Bank</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Stats</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Wallet</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sellers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    No sellers found
                  </td>
                </tr>
              ) : (
                sellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedSellers.includes(seller.id)}
                        onChange={() => toggleSelectSeller(seller.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{seller.business_name || seller.full_name}</p>
                        <p className="text-xs text-gray-500">{formatDate(seller.created_at)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-900">{seller.email}</p>
                        {seller.phone_number && <p className="text-xs text-gray-500">{seller.phone_number}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900">{seller.university?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{seller.state || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getApprovalBadge(seller.approval_status)}`}>
                        {seller.approval_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {seller.bank_verified ? (
                        <span className="text-green-600 text-xs">✓ Verified</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Not verified</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <p className="text-gray-900">{seller.products_count || 0} products</p>
                        <p className="text-gray-500">{seller.orders_count || 0} orders</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{formatPrice(seller.wallet_balance)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAccountBadge(seller.account_status)}`}>
                        {seller.account_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onViewDetails(seller)}
                          className="p-2 hover:bg-blue-100 rounded-full text-blue-600"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {seller.approval_status === 'pending' && (
                          <>
                            <button
                              onClick={() => openActionModal('approve', seller.id)}
                              className="p-2 hover:bg-green-100 rounded-full text-green-600"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openActionModal('reject', seller.id)}
                              className="p-2 hover:bg-red-100 rounded-full text-red-600"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {seller.account_status !== 'banned' && (
                          <button
                            onClick={() => openActionModal('ban', seller.id)}
                            className="p-2 hover:bg-red-100 rounded-full text-red-600"
                            title="Ban Seller"
                          >
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {actionType === 'approve' && (currentSellerId ? 'Approve Seller' : `Approve ${selectedSellers.length} Sellers`)}
              {actionType === 'reject' && 'Reject Seller'}
              {actionType === 'ban' && 'Ban Seller'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {actionType === 'approve' && 'Are you sure you want to approve this seller?'}
              {actionType === 'reject' && 'Provide a reason for rejection'}
              {actionType === 'ban' && 'Provide a reason for banning this seller'}
            </p>
            {(actionType === 'reject' || actionType === 'ban') && (
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                rows={3}
              />
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAction}
                disabled={isPending || ((actionType === 'reject' || actionType === 'ban') && !reason.trim())}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {isPending ? 'Processing...' : 'Confirm'}
              </button>
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setReason('');
                  setCurrentSellerId(null);
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
    </div>
  );
}