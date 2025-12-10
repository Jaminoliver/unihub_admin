'use client';

import { useState, useTransition, useEffect } from 'react';
import { X, AlertTriangle, User, Store, Package, FileText, Image as ImageIcon, CheckCircle, MessageSquare, UserCheck } from 'lucide-react';import { getDisputeDetails, updateDisputeStatus, updateDisputePriority, resolveDispute, addAdminNotes } from '@/app/admin/dashboard/disputes/actions';
import { OrderDisputeDetailsAdmin } from '@/components/admin/order-disputes/OrderDisputeDetailsAdmin';
import { MessageCircle, Send } from 'lucide-react';

import { getDisputeInternalNotes, addDisputeInternalNote } from '@/app/admin/dashboard/disputes/actions';

type DisputeDetail = {
  id: string;
  dispute_number?: string;
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
  assigned_to_admin_id?: string | null;
  assigned_at?: string | null;
  order?: {
    id: string;
    order_number: string;
    total_amount: string;
    payment_method: string;
    payment_status: string;
    order_status: string;
    escrow_amount: string;
    escrow_released: boolean;
    delivery_code: string | null;
    buyer?: { id: string; full_name: string; email: string; phone_number?: string; state: string; university?: { name: string } | null };
    seller?: { id: string; business_name: string; full_name: string; email: string; phone_number?: string; state: string; university?: { name: string } | null };
    product?: { id: string; name: string; image_urls: string[]; condition?: string; brand?: string };
    delivery_address?: { id: string; address_line: string; city: string; state: string; postal_code?: string };
  };
  resolved_by?: { id: string; full_name: string; email: string; role?: string; admin_number?: string } | null;
  assigned_to?: { id: string; full_name: string; email: string; role?: string; admin_number?: string } | null;
};

interface DisputeDetailModalProps {
  disputeId: string;
  onClose: () => void;
}

export function DisputeDetailModal({ disputeId, onClose }: DisputeDetailModalProps) {
  const [isPending, startTransition] = useTransition();
  const [dispute, setDispute] = useState<DisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [resolution, setResolution] = useState('');
  const [adminNotesText, setAdminNotesText] = useState('');
  const [selectedAction, setSelectedAction] = useState<'refund_buyer' | 'release_to_seller' | 'cancelled' | 'no_action'>('no_action');
  const [internalNotes, setInternalNotes] = useState<any[]>([]);
  const [newInternalNote, setNewInternalNote] = useState('');
  const [sendingNote, setSendingNote] = useState(false);
  const [showInternalNotes, setShowInternalNotes] = useState(false);

  useEffect(() => {
  loadDispute();
  loadInternalNotes();
}, [disputeId]);

  const loadDispute = async () => {
    setLoading(true);
    try {
      const result = await getDisputeDetails(disputeId);
      const { dispute: data, error } = result;
      
      if (error) {
        alert(`Error loading dispute: ${error}`);
        return;
      }
      
      if (data) {
        setDispute(data as DisputeDetail);
        setAdminNotesText(data.admin_notes || '');
      } else {
        alert('No dispute data found');
      }
    } catch (err) {
      alert(`Exception: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: string | number) => {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numericPrice)) return '₦0.00';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(numericPrice);
  };

  const loadInternalNotes = async () => {
  try {
    const result = await getDisputeInternalNotes(disputeId);
    if (result.notes) {
      setInternalNotes(result.notes);
    }
  } catch (error) {
    console.error('Error loading internal notes:', error);
  }
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

  const handleSendInternalNote = async () => {
  if (!newInternalNote.trim()) return;
  
  setSendingNote(true);
  try {
    const result = await addDisputeInternalNote(disputeId, newInternalNote);
    if (result.success) {
      setNewInternalNote('');
      await loadInternalNotes();
    } else {
      alert(`Failed to send note: ${result.error}`);
    }
  } catch (error: any) {
    alert(`Error: ${error.message}`);
  } finally {
    setSendingNote(false);
  }
};

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      product_not_received: 'Product Not Received',
      wrong_item_received: 'Wrong Item Received',
      damaged_item: 'Damaged Item',
      fake_counterfeit: 'Fake/Counterfeit Product',
      seller_not_shipping: 'Seller Not Shipping',
      buyer_not_confirming: 'Buyer Not Confirming Delivery',
      payment_issue: 'Payment Issue',
      refund_not_received: 'Refund Not Received',
      other: 'Other Issue',
    };
    return labels[reason] || reason;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleStatusChange = async (newStatus: 'open' | 'under_review' | 'resolved' | 'closed') => {
    startTransition(async () => {
      const result = await updateDisputeStatus(disputeId, newStatus);
      if (result.success) {
        await loadDispute();
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  const handlePriorityChange = async (newPriority: 'low' | 'medium' | 'high') => {
    startTransition(async () => {
      const result = await updateDisputePriority(disputeId, newPriority);
      if (result.success) {
        await loadDispute();
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  const handleSaveNotes = async () => {
    startTransition(async () => {
      const result = await addAdminNotes(disputeId, adminNotesText);
      if (result.success) {
        alert('Notes saved successfully');
        await loadDispute();
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  const handleResolveDispute = async () => {
    if (!resolution.trim()) {
      alert('Please provide a resolution description');
      return;
    }

    startTransition(async () => {
      const result = await resolveDispute(disputeId, selectedAction, resolution, adminNotesText);
      if (result.success) {
        setShowResolveModal(false);
        alert('Dispute resolved successfully');
        await loadDispute();
      } else {
        alert(`Error: ${result.error}`);
      }
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dispute details...</p>
        </div>
      </div>
    );
  }

  if (!dispute) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8">
          <p className="text-red-600">Failed to load dispute details</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  const canResolve = dispute.status !== 'resolved' && dispute.status !== 'closed';

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl max-w-6xl w-full my-8">
          <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-600 text-white p-6 rounded-t-2xl flex items-center justify-between z-10">
            <div>
              <h3 className="text-2xl font-bold">Dispute Resolution</h3>
              <p className="text-orange-100 mt-1">Order: {dispute.order?.order_number}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[calc(90vh-100px)] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-xs text-orange-600 font-semibold uppercase mb-1">Status</p>
                <select
                  value={dispute.status}
                  onChange={(e) => handleStatusChange(e.target.value as any)}
                  disabled={isPending || dispute.status === 'resolved'}
                  className="w-full mt-1 px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white font-semibold text-gray-900 capitalize"
                >
                  <option value="open">Open</option>
                  <option value="under_review">Under Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-xs text-yellow-600 font-semibold uppercase mb-1">Priority</p>
                <select
                  value={dispute.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as any)}
                  disabled={isPending || dispute.status === 'resolved'}
                  className="w-full mt-1 px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 bg-white font-semibold text-gray-900 capitalize"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-600 font-semibold uppercase mb-1">Raised By</p>
                <div className="flex items-center gap-2 mt-2">
                  {dispute.raised_by_type === 'buyer' ? (
                    <User className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Store className="h-5 w-5 text-purple-600" />
                  )}
                  <p className="font-semibold text-gray-900 capitalize">{dispute.raised_by_type}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order & Product Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex gap-4">
                  {getFirstImage(dispute.order?.product?.image_urls || null) ? (
                    <img
                      src={getFirstImage(dispute.order?.product?.image_urls || null)!}
                      alt={dispute.order?.product?.name}
                      className="h-20 w-20 rounded-lg object-cover border"
                    />
                  ) : (
                    <div className="h-20 w-20 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-xs text-gray-400">No Image</span>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{dispute.order?.product?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-600 mt-1">Order: {dispute.order?.order_number}</p>
                    <p className="text-sm text-gray-600">Amount: {formatPrice(dispute.order?.total_amount || '0')}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600">Payment: <span className="font-medium capitalize">{dispute.order?.payment_method}</span></p>
                  <p className="text-gray-600">Status: <span className="font-medium capitalize">{dispute.order?.order_status}</span></p>
                  <p className="text-gray-600">Escrow: <span className="font-medium">{formatPrice(dispute.order?.escrow_amount || '0')}</span></p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Buyer
                </h4>
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-gray-900">{dispute.order?.buyer?.full_name}</p>
                  <p className="text-gray-600">{dispute.order?.buyer?.email}</p>
                  {dispute.order?.buyer?.phone_number && (
                    <p className="text-gray-600">{dispute.order?.buyer?.phone_number}</p>
                  )}
                  <p className="text-gray-600">{dispute.order?.buyer?.state} • {dispute.order?.buyer?.university?.name}</p>
                </div>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Store className="h-5 w-5 text-purple-600" />
                  Seller
                </h4>
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-gray-900">{dispute.order?.seller?.business_name || dispute.order?.seller?.full_name}</p>
                  <p className="text-gray-600">{dispute.order?.seller?.email}</p>
                  {dispute.order?.seller?.phone_number && (
                    <p className="text-gray-600">{dispute.order?.seller?.phone_number}</p>
                  )}
                  <p className="text-gray-600">{dispute.order?.seller?.state} • {dispute.order?.seller?.university?.name}</p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 rounded-xl p-6 border border-red-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Dispute Information
              </h4>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Reason</p>
                  <p className="text-sm font-medium text-gray-900">{getReasonLabel(dispute.dispute_reason)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Description</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{dispute.description}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Created</p>
                  <p className="text-sm text-gray-700">{formatDate(dispute.created_at)}</p>
                </div>
              </div>

              {dispute.evidence_urls && dispute.evidence_urls.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-2 flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" />
                    Evidence ({dispute.evidence_urls.length})
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {dispute.evidence_urls.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-orange-500 transition"
                      >
                        <img src={url} alt={`Evidence ${index + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-semibold">View Full</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {/* Assigned Admin Info */}
            {dispute.assigned_to_admin_id && dispute.assigned_to && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-green-600" />
                  Assigned Administrator
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Admin Name</p>
                    <p className="text-sm font-medium text-gray-900">{dispute.assigned_to.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Admin ID</p>
                    <p className="text-sm font-mono font-semibold text-green-700">{dispute.assigned_to.admin_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Role</p>
                    <span className={`inline-flex text-xs px-2 py-1 rounded-full font-semibold ${
                      dispute.assigned_to.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                      dispute.assigned_to.role === 'financial_admin' ? 'bg-green-100 text-green-700' :
                      dispute.assigned_to.role === 'support' ? 'bg-blue-100 text-blue-700' :
                      dispute.assigned_to.role === 'moderator' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {dispute.assigned_to.role === 'super_admin' ? 'Super Admin' :
                       dispute.assigned_to.role === 'financial_admin' ? 'Financial Admin' :
                       dispute.assigned_to.role === 'support' ? 'Support' :
                       dispute.assigned_to.role === 'moderator' ? 'Moderator' : 'Admin'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Email</p>
                    <p className="text-sm text-gray-600">{dispute.assigned_to.email}</p>
                  </div>
                  {dispute.assigned_at && (
                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-600 font-semibold uppercase mb-1">Assigned On</p>
                      <p className="text-sm text-gray-600">{formatDate(dispute.assigned_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5 text-yellow-600" />
                Admin Notes (Internal)
              </h4>
              <textarea
                value={adminNotesText}
                onChange={(e) => setAdminNotesText(e.target.value)}
                placeholder="Add internal notes about this dispute..."
                className="w-full px-4 py-3 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 min-h-[100px] bg-white"
                disabled={isPending || dispute.status === 'resolved'}
              />
              <button
                onClick={handleSaveNotes}
                disabled={isPending || dispute.status === 'resolved'}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isPending ? 'Saving...' : 'Save Notes'}
              </button>
            </div>

            {/* Internal Notes Section */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <button
                onClick={() => setShowInternalNotes(!showInternalNotes)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">Internal Admin Notes</h4>
                  <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                    {internalNotes.length}
                  </span>
                </div>
                <span className="text-sm text-blue-600">
                  {showInternalNotes ? 'Hide' : 'Show'}
                </span>
              </button>

              {showInternalNotes && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-blue-700 mb-3">
                    💡 These notes are only visible to admins and are used for internal coordination.
                  </p>

                  <div className="max-h-64 overflow-y-auto space-y-2 mb-3">
                    {internalNotes.length === 0 ? (
                      <p className="text-sm text-gray-500 italic text-center py-4">
                        No internal notes yet
                      </p>
                    ) : (
                      internalNotes.map((note: any) => (
                        <div key={note.id} className="bg-white rounded-lg p-3 border border-blue-200">
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-xs font-semibold text-blue-900">
                              {note.admin?.full_name || 'Admin'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(note.created_at).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.note}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-2">
                    <textarea
                      value={newInternalNote}
                      onChange={(e) => setNewInternalNote(e.target.value)}
                      placeholder="Add internal note for other admins..."
                      className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                      rows={2}
                      disabled={sendingNote}
                    />
                    <button
                      onClick={handleSendInternalNote}
                      disabled={!newInternalNote.trim() || sendingNote}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingNote ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {dispute.status === 'resolved' && dispute.resolution && (
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Resolution
                </h4>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-700">{dispute.resolution}</p>
                  {dispute.admin_action && (
                    <p className="text-gray-600">
                      Action: <span className="font-medium capitalize">{dispute.admin_action.replace('_', ' ')}</span>
                    </p>
                  )}
                  {dispute.resolved_at && (
                    <p className="text-gray-600">Resolved: {formatDate(dispute.resolved_at)}</p>
                  )}
                  {dispute.resolved_by && (
                    <p className="text-gray-600">By: {dispute.resolved_by.full_name}</p>
                  )}
                </div>
              </div>
            )}

            {canResolve && (
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowChatModal(true)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition font-semibold flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-5 w-5" />
                  Open Chat
                </button>
                <button
                  onClick={() => setShowResolveModal(true)}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition font-semibold"
                >
                  Resolve Dispute
                </button>
              </div>
            )}
          </div>
        </div>
      </div>      

      
      {showResolveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Resolve Dispute</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Action to Take</label>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="refund_buyer">Refund Buyer</option>
                  <option value="release_to_seller">Release Payment to Seller</option>
                  <option value="cancelled">Cancel Order</option>
                  <option value="no_action">Close Without Action</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Resolution Description *</label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Explain the resolution decision..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 min-h-[120px]"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowResolveModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveDispute}
                  disabled={isPending}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition font-semibold disabled:opacity-50"
                >
                  {isPending ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showChatModal && dispute && dispute.order && (
        <OrderDisputeDetailsAdmin
          dispute={{
            id: dispute.id,
            order_id: dispute.order_id,
            dispute_reason: dispute.dispute_reason,
            description: dispute.description,
            status: dispute.status,
            priority: dispute.priority,
            resolution: dispute.resolution,
            created_at: dispute.created_at,
            order: {
              order_number: dispute.order.order_number,
              total_amount: parseFloat(dispute.order.total_amount || '0'),
              product: {
                name: dispute.order.product?.name || 'Unknown Product',
                image_urls: dispute.order.product?.image_urls || []
              },
              buyer: {
                full_name: dispute.order.buyer?.full_name || 'Unknown Buyer',
                email: dispute.order.buyer?.email || ''
              },
              seller: {
                business_name: dispute.order.seller?.business_name || '',
                full_name: dispute.order.seller?.full_name || 'Unknown Seller',
                email: dispute.order.seller?.email || ''
              }
            }
          }}
          onClose={() => {
            setShowChatModal(false);
            loadDispute();
          }}
          onUpdate={loadDispute}
        />
      )}
    </>
  );
}