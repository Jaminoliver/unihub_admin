'use client';

import { useState, useTransition } from 'react';
import { CheckCircle, XCircle, Store, MapPin, Calendar } from 'lucide-react';
import { approveSeller, rejectSeller } from '@/app/admin/dashboard/users/actions';

type Seller = {
  id: string;
  business_name: string | null;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  state: string | null;
  created_at: string;
  university?: { name: string; state: string } | null;
};

interface SellerApprovalCardProps {
  seller: Seller;
  onAction: () => void;
}

export function SellerApprovalCard({ seller, onAction }: SellerApprovalCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reason, setReason] = useState('');

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveSeller(seller.id);
      if (result.success) {
        onAction();
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  const handleReject = () => {
    if (!reason.trim()) {
      alert('Please provide a reason');
      return;
    }

    startTransition(async () => {
      const result = await rejectSeller(seller.id, reason);
      if (result.success) {
        setShowRejectModal(false);
        setReason('');
        onAction();
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Store className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">
                {seller.business_name || seller.full_name || 'No Name'}
              </h4>
              <p className="text-sm text-gray-600 truncate">{seller.email}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-600 mb-4">
          {seller.university?.name && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{seller.university.name}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>{new Date(seller.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleApprove}
            disabled={isPending}
            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Approve
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={isPending}
            className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        </div>
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject Seller</h3>
            <p className="text-sm text-gray-600 mb-4">
              Provide a reason for rejecting {seller.business_name || seller.full_name}
            </p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleReject}
                disabled={isPending || !reason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
              >
                {isPending ? 'Processing...' : 'Confirm Reject'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
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