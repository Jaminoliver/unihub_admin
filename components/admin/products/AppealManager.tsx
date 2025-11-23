'use client';

import { useState, useTransition } from 'react';
import { MessageSquare, CheckCircle, XCircle, Eye, Clock, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { approveAppeal, rejectAppeal } from '@/app/admin/dashboard/products/actions';

interface Appeal {
  id: string;
  product_id: string;
  seller_id: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  admin_reason?: string;
  products: {
    name: string;
    price: number;
    image_urls: string[];
    admin_suspension_reason?: string;
  };
  sellers: {
    business_name: string;
    full_name: string;
  };
}

interface AppealsManagerProps {
  appeals: Appeal[];
}

export function AppealsManager({ appeals }: AppealsManagerProps) {
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [isPending, startTransition] = useTransition();
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const router = useRouter();

  const handleApprove = async (appeal: Appeal) => {
    startTransition(async () => {
      try {
        console.log('🔵 Starting approval process...');
        console.log('Appeal ID:', appeal.id);
        console.log('Product ID:', appeal.product_id);

        const result = await approveAppeal(appeal.id, appeal.product_id);

        console.log('📊 Result:', result);

        if (!result.success) {
          throw new Error(result.error || 'Failed to approve appeal');
        }

        toast.success('Appeal approved and product unsuspended');
        router.refresh();
        setSelectedAppeal(null);
      } catch (error) {
        console.error('❌ Error approving appeal:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to approve appeal');
      }
    });
  };

  const handleReject = async () => {
    if (!selectedAppeal || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    startTransition(async () => {
      try {
        console.log('🔴 Starting rejection process...');
        console.log('Appeal ID:', selectedAppeal.id);
        console.log('Reason:', rejectionReason);

        const result = await rejectAppeal(selectedAppeal.id, rejectionReason);

        console.log('📊 Result:', result);

        if (!result.success) {
          throw new Error(result.error || 'Failed to reject appeal');
        }

        toast.success('Appeal rejected');
        router.refresh();
        setSelectedAppeal(null);
        setShowRejectDialog(false);
        setRejectionReason('');
      } catch (error) {
        console.error('❌ Error rejecting appeal:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to reject appeal');
      }
    });
  };

  const pendingAppeals = appeals.filter((a) => a.status === 'pending');
  const processedAppeals = appeals.filter((a) => a.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-orange-600 font-medium">Pending Appeals</p>
              <p className="text-2xl font-bold text-orange-900">{pendingAppeals.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-green-600 font-medium">Approved</p>
              <p className="text-2xl font-bold text-green-900">
                {appeals.filter((a) => a.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500 rounded-lg">
              <XCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-red-600 font-medium">Rejected</p>
              <p className="text-2xl font-bold text-red-900">
                {appeals.filter((a) => a.status === 'rejected').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Appeals */}
      {pendingAppeals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              Pending Appeals ({pendingAppeals.length})
            </h2>
            <p className="text-sm text-gray-600 mt-1">Review and respond to seller appeals</p>
          </div>
          <div className="divide-y divide-gray-200">
            {pendingAppeals.map((appeal) => (
              <div key={appeal.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    {appeal.products.image_urls?.[0] ? (
                      <img
                        src={appeal.products.image_urls[0]}
                        alt={appeal.products.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Appeal Details */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{appeal.products.name}</h3>
                        <p className="text-sm text-gray-600">
                          by {appeal.sellers.business_name || appeal.sellers.full_name}
                        </p>
                      </div>
                      <span className="text-lg font-bold text-gray-900">
                        ₦{appeal.products.price.toLocaleString()}
                      </span>
                    </div>

                    {/* Original Suspension Reason */}
                    {appeal.products.admin_suspension_reason && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-xs font-medium text-red-600 uppercase mb-1">
                          Original Suspension Reason
                        </p>
                        <p className="text-sm text-red-900">
                          {appeal.products.admin_suspension_reason}
                        </p>
                      </div>
                    )}

                    {/* Appeal Message */}
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs font-medium text-blue-600 uppercase mb-1">
                        Seller's Appeal
                      </p>
                      <p className="text-sm text-gray-900">{appeal.message}</p>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <span>Submitted {format(new Date(appeal.created_at), 'MMM d, yyyy')}</span>
                      <span>•</span>
                      <span>{format(new Date(appeal.created_at), 'h:mm a')}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(appeal)}
                        disabled={isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve & Unsuspend
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedAppeal(appeal);
                          setShowRejectDialog(true);
                        }}
                        disabled={isPending}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Appeal
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedAppeal(appeal)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processed Appeals */}
      {processedAppeals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">
              Processed Appeals ({processedAppeals.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {processedAppeals.map((appeal) => (
              <div key={appeal.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{appeal.products.name}</h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          appeal.status === 'approved'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {appeal.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      by {appeal.sellers.business_name || appeal.sellers.full_name}
                    </p>
                    {appeal.admin_reason && (
                      <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                        <span className="font-medium">Admin response:</span> {appeal.admin_reason}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {format(new Date(appeal.updated_at), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Appeals */}
      {appeals.length === 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
          <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Appeals Yet</h3>
          <p className="text-gray-600">When sellers appeal suspensions, they'll appear here</p>
        </div>
      )}

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Appeal</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this appeal. The seller will see this message.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Explain why this appeal is being rejected..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={5}
            className="resize-none"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
              }}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={isPending || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isPending ? 'Rejecting...' : 'Reject Appeal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={!!selectedAppeal && !showRejectDialog} onOpenChange={() => setSelectedAppeal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Appeal Details</DialogTitle>
          </DialogHeader>
          {selectedAppeal && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Product</h4>
                <p className="text-gray-900">{selectedAppeal.products.name}</p>
                <p className="text-sm text-gray-600">
                  ₦{selectedAppeal.products.price.toLocaleString()}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Seller</h4>
                <p className="text-gray-900">
                  {selectedAppeal.sellers.business_name || selectedAppeal.sellers.full_name}
                </p>
              </div>
              {selectedAppeal.products.admin_suspension_reason && (
                <div>
                  <h4 className="font-semibold mb-2">Original Suspension Reason</h4>
                  <p className="text-gray-900 bg-red-50 p-3 rounded">
                    {selectedAppeal.products.admin_suspension_reason}
                  </p>
                </div>
              )}
              <div>
                <h4 className="font-semibold mb-2">Appeal Message</h4>
                <p className="text-gray-900 bg-blue-50 p-3 rounded">{selectedAppeal.message}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Submitted</h4>
                <p className="text-gray-600">
                  {format(new Date(selectedAppeal.created_at), 'PPP p')}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}