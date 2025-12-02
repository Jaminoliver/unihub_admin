'use client';

import { useState, useTransition } from 'react';
import { MessageSquare, CheckCircle, XCircle, Eye, Clock, Package, Filter } from 'lucide-react';
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
import { approveAppeal, rejectAppeal, getProductDetails } from '@/app/admin/dashboard/products/actions';
import { ProductDetailPage } from '@/components/admin/products/ProductDetailSheet';

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

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

export function AppealsManager({ appeals }: AppealsManagerProps) {
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null);
  const [isPending, startTransition] = useTransition();
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [appealContext, setAppealContext] = useState<Appeal | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);
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

  const handleViewProduct = async (appeal: Appeal) => {
    setLoadingProduct(true);
    try {
      const result = await getProductDetails(appeal.product_id);
      if (result.product) {
        setSelectedProduct(result.product);
        setAppealContext(appeal);
      } else {
        toast.error('Failed to load product details');
      }
    } catch (error) {
      toast.error('Error loading product details');
      console.error(error);
    } finally {
      setLoadingProduct(false);
    }
  };

  const filteredAppeals = appeals.filter((appeal) => {
    if (filterStatus === 'all') return true;
    return appeal.status === filterStatus;
  });

  const pendingCount = appeals.filter((a) => a.status === 'pending').length;
  const approvedCount = appeals.filter((a) => a.status === 'approved').length;
  const rejectedCount = appeals.filter((a) => a.status === 'rejected').length;

  return (
    <>
      <div className="space-y-6">
        {/* Statistics - Now Clickable */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => setFilterStatus('all')}
            className={`text-left bg-gradient-to-br from-blue-50 to-indigo-50 border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
              filterStatus === 'all' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-blue-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">All Appeals</p>
                <p className="text-2xl font-bold text-blue-900">{appeals.length}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setFilterStatus('pending')}
            className={`text-left bg-orange-50 border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
              filterStatus === 'pending' ? 'border-orange-500 ring-2 ring-orange-200' : 'border-orange-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500 rounded-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Pending Appeals</p>
                <p className="text-2xl font-bold text-orange-900">{pendingCount}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setFilterStatus('approved')}
            className={`text-left bg-green-50 border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
              filterStatus === 'approved' ? 'border-green-500 ring-2 ring-green-200' : 'border-green-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Approved</p>
                <p className="text-2xl font-bold text-green-900">{approvedCount}</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setFilterStatus('rejected')}
            className={`text-left bg-red-50 border-2 rounded-xl p-6 transition-all hover:shadow-lg ${
              filterStatus === 'rejected' ? 'border-red-500 ring-2 ring-red-200' : 'border-red-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500 rounded-lg">
                <XCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-red-600 font-medium">Rejected</p>
                <p className="text-2xl font-bold text-red-900">{rejectedCount}</p>
              </div>
            </div>
          </button>
        </div>

        {/* Filter Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <span className="text-sm text-gray-600">
              Showing: <span className="font-semibold capitalize">{filterStatus}</span> ({filteredAppeals.length} appeals)
            </span>
          </div>
          {filterStatus !== 'all' && (
            <Button variant="ghost" size="sm" onClick={() => setFilterStatus('all')}>
              Clear Filter
            </Button>
          )}
        </div>

        {/* Appeals List */}
        {filteredAppeals.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                {filterStatus === 'pending' && `Pending Appeals (${filteredAppeals.length})`}
                {filterStatus === 'approved' && `Approved Appeals (${filteredAppeals.length})`}
                {filterStatus === 'rejected' && `Rejected Appeals (${filteredAppeals.length})`}
                {filterStatus === 'all' && `All Appeals (${filteredAppeals.length})`}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {filterStatus === 'pending' && 'Review and respond to seller appeals'}
                {filterStatus === 'approved' && 'Previously approved appeals'}
                {filterStatus === 'rejected' && 'Previously rejected appeals'}
                {filterStatus === 'all' && 'All appeal submissions'}
              </p>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredAppeals.map((appeal) => (
                <div key={appeal.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {appeal.products.image_urls?.[0] ? (
                        <img
                          src={appeal.products.image_urls[0]}
                          alt={appeal.products.name}
                          className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                          onClick={() => handleViewProduct(appeal)}
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
                          <h3 
                            className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer transition"
                            onClick={() => handleViewProduct(appeal)}
                          >
                            {appeal.products.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            by {appeal.sellers.business_name || appeal.sellers.full_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-gray-900">
                            ₦{appeal.products.price.toLocaleString()}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              appeal.status === 'pending'
                                ? 'bg-orange-100 text-orange-700'
                                : appeal.status === 'approved'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {appeal.status === 'pending' && '⏳ Pending'}
                            {appeal.status === 'approved' && '✓ Approved'}
                            {appeal.status === 'rejected' && '✗ Rejected'}
                          </span>
                        </div>
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

                      {/* Admin Response for rejected appeals */}
                      {appeal.status === 'rejected' && appeal.admin_reason && (
                        <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                          <p className="text-xs font-medium text-gray-600 uppercase mb-1">
                            Admin Response
                          </p>
                          <p className="text-sm text-gray-900">{appeal.admin_reason}</p>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                        <span>Submitted {format(new Date(appeal.created_at), 'MMM d, yyyy')}</span>
                        <span>•</span>
                        <span>{format(new Date(appeal.created_at), 'h:mm a')}</span>
                        {appeal.status !== 'pending' && (
                          <>
                            <span>•</span>
                            <span>Processed {format(new Date(appeal.updated_at), 'MMM d, yyyy')}</span>
                          </>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewProduct(appeal)}
                          disabled={loadingProduct}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {loadingProduct ? 'Loading...' : 'View Product Details'}
                        </Button>
                        
                        {appeal.status === 'pending' && (
                          <>
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
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No {filterStatus !== 'all' ? filterStatus : ''} Appeals
            </h3>
            <p className="text-gray-600">
              {filterStatus === 'all' && 'No appeals have been submitted yet'}
              {filterStatus === 'pending' && 'No pending appeals at the moment'}
              {filterStatus === 'approved' && 'No approved appeals yet'}
              {filterStatus === 'rejected' && 'No rejected appeals yet'}
            </p>
          </div>
        )}
      </div>

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

      {/* Product Detail View with Appeal Context */}
      {selectedProduct && appealContext && (
        <ProductDetailPage
          product={selectedProduct}
          onBack={() => {
            setSelectedProduct(null);
            setAppealContext(null);
          }}
          onAction={() => {
            router.refresh();
            setSelectedProduct(null);
            setAppealContext(null);
          }}
          appealContext={{
            appealId: appealContext.id,
            appealMessage: appealContext.message,
            appealStatus: appealContext.status,
            appealCreatedAt: appealContext.created_at,
            appealUpdatedAt: appealContext.updated_at,
            adminReason: appealContext.admin_reason,
          }}
        />
      )}
    </>
  );
}