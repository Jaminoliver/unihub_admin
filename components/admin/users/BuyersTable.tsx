'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Eye, Ban, Shield } from 'lucide-react';
import { banUser, unbanUser } from '@/app/admin/dashboard/users/actions';

type Buyer = {
  id: string;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  state: string | null;
  account_status: string;
  created_at: string;
  orders_count?: number;
  university?: { name: string; state: string } | null;
};

interface BuyersTableProps {
  buyers: Buyer[];
  universities: { id: string; name: string }[];
  states: string[];
  onViewDetails: (buyer: Buyer) => void;
}

export function BuyersTable({ buyers, universities, states, onViewDetails }: BuyersTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [localSearch, setLocalSearch] = useState('');
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);

  const currentState = searchParams.get('state') || 'all';
  const currentUniversity = searchParams.get('university') || 'all';
  const currentAccountStatus = searchParams.get('accountStatus') || 'all';

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

  const openBanModal = (buyerId: string) => {
    setSelectedBuyerId(buyerId);
    setShowBanModal(true);
  };

  const handleBan = async () => {
    if (!banReason.trim() || !selectedBuyerId) {
      alert('Please provide a reason');
      return;
    }

    startTransition(async () => {
      const result = await banUser(selectedBuyerId, 'buyer', banReason);
      if (result.success) {
        setShowBanModal(false);
        setBanReason('');
        setSelectedBuyerId(null);
        router.refresh();
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  const handleUnban = async (buyerId: string) => {
    if (!confirm('Are you sure you want to unban this user?')) return;

    startTransition(async () => {
      const result = await unbanUser(buyerId, 'buyer');
      if (result.success) {
        router.refresh();
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  const getAccountBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      banned: 'bg-red-100 text-red-800',
      suspended: 'bg-orange-100 text-orange-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
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
        <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search buyers..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            onBlur={handleSearchSubmit}
            className="flex-1 outline-none text-sm bg-transparent"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={currentAccountStatus}
            onChange={(e) => handleFilterChange('accountStatus', e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Account Status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
            <option value="suspended">Suspended</option>
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
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Join Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {buyers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No buyers found
                  </td>
                </tr>
              ) : (
                buyers.map((buyer) => (
                  <tr key={buyer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{buyer.full_name || 'No Name'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-900">{buyer.email}</p>
                        {buyer.phone_number && <p className="text-xs text-gray-500">{buyer.phone_number}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900">{buyer.university?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{buyer.state || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">{buyer.orders_count || 0}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500">{formatDate(buyer.created_at)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAccountBadge(buyer.account_status)}`}>
                        {buyer.account_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => onViewDetails(buyer)}
                          className="p-2 hover:bg-blue-100 rounded-full text-blue-600"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {buyer.account_status === 'banned' ? (
                          <button
                            onClick={() => handleUnban(buyer.id)}
                            disabled={isPending}
                            className="p-2 hover:bg-green-100 rounded-full text-green-600"
                            title="Unban User"
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => openBanModal(buyer.id)}
                            disabled={isPending}
                            className="p-2 hover:bg-red-100 rounded-full text-red-600"
                            title="Ban User"
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

      {showBanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ban User</h3>
            <p className="text-sm text-gray-600 mb-4">
              Provide a reason for banning this user
            </p>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Enter reason..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleBan}
                disabled={isPending || !banReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {isPending ? 'Processing...' : 'Confirm Ban'}
              </button>
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setBanReason('');
                  setSelectedBuyerId(null);
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