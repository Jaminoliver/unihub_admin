'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Eye, AlertTriangle, Store, UserPlus, UserCheck, X, UserMinus } from 'lucide-react';
import { SellerDisputeDetailModal } from './SellerDisputeDetailModal';
import { 
  assignSellerDisputeToMe, 
  assignSellerDisputeToAdmin, 
  unassignSellerDispute, 
  getAdminsList 
} from '@/app/admin/dashboard/seller-disputes/actions';

type SellerDispute = {
  id: string;
  dispute_number?: string;
  seller_id: string;
  dispute_type: string;
  title: string;
  description: string;
  evidence_urls: string[] | null;
  status: 'open' | 'under_review' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  admin_notes: string | null;
  resolution: string | null;
  resolved_by_admin_id: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_to_admin_id?: string | null;
  assigned_at?: string | null;
  seller?: {
    id: string;
    business_name: string;
    full_name: string;
    email: string;
    state: string;
  };
  resolved_by?: { id: string; full_name: string; email: string; role?: string; admin_number?: string } | null;
  assigned_to?: { id: string; full_name: string; email: string; role?: string; admin_number?: string } | null;
};

interface SellerDisputesTableProps {
  disputes: SellerDispute[];
  adminId: string;
  onAssignmentChange: () => void;
  filters?: {
    search?: string;
    priority?: string;
  };
}

interface AssignModalProps {
  disputeId: string;
  currentAdminId: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Admin {
  id: string;
  full_name: string;
  email: string;
  role?: string;
  admin_number?: string;
}

function AssignModal({ disputeId, currentAdminId, onClose, onSuccess }: AssignModalProps) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useState(() => {
    loadAdmins();
  });

  const loadAdmins = async () => {
    setLoading(true);
    const result = await getAdminsList();
    if (result.admins) {
      setAdmins(result.admins);
      setSelectedAdminId(currentAdminId);
    }
    setLoading(false);
  };

  const handleAssign = async () => {
    if (!selectedAdminId) return;
    
    setAssigning(true);
    const result = await assignSellerDisputeToAdmin(disputeId, selectedAdminId);
    if (result.success) {
      onSuccess();
      onClose();
    } else {
      alert(`Failed to assign: ${result.error}`);
    }
    setAssigning(false);
  };

  const getRoleBadge = (role?: string) => {
    const roleConfig: Record<string, { label: string; color: string }> = {
      super_admin: { label: 'Super Admin', color: 'bg-purple-100 text-purple-700' },
      financial_admin: { label: 'Financial Admin', color: 'bg-green-100 text-green-700' },
      support: { label: 'Support', color: 'bg-blue-100 text-blue-700' },
      moderator: { label: 'Moderator', color: 'bg-yellow-100 text-yellow-700' },
      admin: { label: 'Admin', color: 'bg-gray-100 text-gray-700' },
    };

    const config = roleConfig[role || 'admin'] || roleConfig.admin;
    
    return (
      <span className={`text-xs ${config.color} px-2 py-0.5 rounded-full font-semibold`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">Assign Dispute</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mx-auto"></div>
            <p className="text-sm text-gray-600 mt-3">Loading admins...</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Assign to Admin:
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {admins.map((admin) => (
                  <label
                    key={admin.id}
                    className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-all ${
                      selectedAdminId === admin.id
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="admin"
                      value={admin.id}
                      checked={selectedAdminId === admin.id}
                      onChange={(e) => setSelectedAdminId(e.target.value)}
                      className="w-4 h-4 text-orange-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {admin.full_name}
                        </p>
                        {admin.id === currentAdminId && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                        {getRoleBadge(admin.role)}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">{admin.email}</p>
                        {admin.admin_number && (
                          <span className="text-xs font-mono text-gray-500">• {admin.admin_number}</span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedAdminId || assigning}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition disabled:opacity-50"
              >
                {assigning ? 'Assigning...' : 'Assign Dispute'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const DISPUTE_TYPE_LABELS: Record<string, string> = {
  account_suspension: 'Account Suspension',
  product_rejection: 'Product Rejection',
  commission_dispute: 'Commission Dispute',
  payout_delay: 'Payout Delay',
  unfair_review: 'Unfair Review',
  policy_disagreement: 'Policy Disagreement',
  verification_issue: 'Verification Issue',
  other: 'Other',
};

export function SellerDisputesTable({ disputes, adminId, onAssignmentChange, filters }: SellerDisputesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [localSearch, setLocalSearch] = useState(filters?.search || '');
  const [selectedDispute, setSelectedDispute] = useState<SellerDispute | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [disputeToAssign, setDisputeToAssign] = useState<string | null>(null);
  const [unassigningId, setUnassigningId] = useState<string | null>(null);

  const currentPriority = searchParams.get('priority') || 'all';

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

  const handleAssignToMe = async (e: React.MouseEvent, disputeId: string) => {
    e.stopPropagation();
    setAssigningId(disputeId);
    
    startTransition(async () => {
      const result = await assignSellerDisputeToMe(disputeId);
      if (result.success) {
        onAssignmentChange();
      } else {
        alert(`Failed to assign: ${result.error}`);
      }
      setAssigningId(null);
    });
  };

  const handleUnassign = async (e: React.MouseEvent, disputeId: string) => {
    e.stopPropagation();
    if (!confirm('Unassign this dispute and return it to the queue?')) return;
    
    setUnassigningId(disputeId);
    startTransition(async () => {
      const result = await unassignSellerDispute(disputeId);
      if (result.success) {
        onAssignmentChange();
      } else {
        alert(`Failed to unassign: ${result.error}`);
      }
      setUnassigningId(null);
    });
  };

  const openAssignModal = (e: React.MouseEvent, disputeId: string) => {
    e.stopPropagation();
    setDisputeToAssign(disputeId);
    setShowAssignModal(true);
  };

  const openDisputeDetails = (dispute: SellerDispute) => {
    setSelectedDispute(dispute);
    setShowDetailModal(true);
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
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      urgent: 'bg-red-100 text-red-700 border-red-200',
    };
    return styles[priority as keyof typeof styles] || styles.medium;
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
                  placeholder="Search by dispute number, title or description..."
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
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
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
                  Dispute & Seller
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {disputes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
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
                    {/* Dispute & Seller */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">
                            {dispute.title}
                          </p>
                          <p className="text-xs text-purple-600 font-mono font-semibold">
                            {dispute.dispute_number || 'No ID'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Store className="h-3 w-3 text-gray-400" />
                            <p className="text-sm text-gray-600 truncate">
                              {dispute.seller?.business_name || dispute.seller?.full_name}
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">
                        {DISPUTE_TYPE_LABELS[dispute.dispute_type]}
                      </p>
                    </td>

                    {/* Assigned To */}
                    <td className="px-6 py-4">
                      {dispute.assigned_to_admin_id && dispute.assigned_to ? (
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-900">
                                {dispute.assigned_to.full_name || 'Admin'}
                              </p>
                              {dispute.assigned_to.role && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                                  dispute.assigned_to.role === 'super_admin' ? 'bg-purple-100 text-purple-700' :
                                  dispute.assigned_to.role === 'financial_admin' ? 'bg-green-100 text-green-700' :
                                  dispute.assigned_to.role === 'support' ? 'bg-blue-100 text-blue-700' :
                                  dispute.assigned_to.role === 'moderator' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {dispute.assigned_to.role === 'super_admin' ? 'Super Admin' :
                                   dispute.assigned_to.role === 'financial_admin' ? 'Financial' :
                                   dispute.assigned_to.role === 'support' ? 'Support' :
                                   dispute.assigned_to.role === 'moderator' ? 'Moderator' : 'Admin'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {dispute.assigned_to.admin_number && (
                                <span className="font-mono">{dispute.assigned_to.admin_number}</span>
                              )}
                              {dispute.assigned_to_admin_id === adminId && (
                                <span className="text-green-600 font-semibold">• You</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Unassigned</span>
                      )}
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

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Only show assignment buttons if NOT resolved/closed */}
                        {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
                          <>
                            {!dispute.assigned_to_admin_id ? (
                              <>
                                <button
                                  onClick={(e) => handleAssignToMe(e, dispute.id)}
                                  disabled={assigningId === dispute.id}
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all font-medium text-sm disabled:opacity-50"
                                >
                                  <UserPlus className="h-4 w-4" />
                                  {assigningId === dispute.id ? 'Assigning...' : 'Assign to Me'}
                                </button>
                                <button
                                  onClick={(e) => openAssignModal(e, dispute.id)}
                                  className="inline-flex items-center gap-2 px-3 py-2 border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-all font-medium text-sm"
                                >
                                  <UserCheck className="h-4 w-4" />
                                  Assign to...
                                </button>
                              </>
                            ) : dispute.assigned_to_admin_id === adminId ? (
                              <button
                                onClick={(e) => handleUnassign(e, dispute.id)}
                                disabled={unassigningId === dispute.id}
                                className="inline-flex items-center gap-2 px-3 py-2 border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition-all font-medium text-sm disabled:opacity-50"
                              >
                                <UserMinus className="h-4 w-4" />
                                {unassigningId === dispute.id ? 'Unassigning...' : 'Unassign'}
                              </button>
                            ) : null}
                          </>
                        )}
                        
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
                      </div>
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

      {/* Assign Modal */}
      {showAssignModal && disputeToAssign && (
        <AssignModal
          disputeId={disputeToAssign}
          currentAdminId={adminId}
          onClose={() => {
            setShowAssignModal(false);
            setDisputeToAssign(null);
          }}
          onSuccess={() => {
            onAssignmentChange();
          }}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedDispute && (
        <SellerDisputeDetailModal
          disputeId={selectedDispute.id}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedDispute(null);
            onAssignmentChange();
          }}
        />
      )}
    </>
  );
}