'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  User, Mail, Phone, MapPin, Building2, University, CreditCard,
  Wallet, TrendingUp, TrendingDown, Calendar, CheckCircle, XCircle,
  AlertTriangle, Clock, History, DollarSign, FileText
} from 'lucide-react';
import { processWithdrawal, rejectWithdrawal, putWithdrawalOnHold, resumeWithdrawal } from '@/app/admin/dashboard/withdrawals/actions';

interface WithdrawalDetailsModalProps {
  withdrawal: any;
  isOpen: boolean;
  onClose: () => void;
}

export function WithdrawalDetailsModal({ withdrawal, isOpen, onClose }: WithdrawalDetailsModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showHoldForm, setShowHoldForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [holdReason, setHoldReason] = useState('');

  if (!withdrawal) return null;

  const seller = withdrawal.seller;
  const stats = withdrawal.sellerStats;
  const amount = parseFloat(withdrawal.amount);
  const currentBalance = parseFloat(seller?.wallet_balance || '0');
  const balanceAfterWithdrawal = currentBalance - amount;

  const formatPrice = (value: number) => 
    `₦${value.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  const hasWarnings = !seller?.is_verified || !seller?.bank_verified || stats?.disputes > 0;

  const handleApprove = async () => {
    if (!confirm(`Are you sure you want to process this withdrawal of ${formatPrice(amount)}?`)) {
      return;
    }

    setIsProcessing(true);
    const result = await processWithdrawal(withdrawal.id);
    
    if (result.success) {
      alert('Withdrawal processed successfully!');
      onClose();
      window.location.reload();
    } else {
      alert(result.error || 'Failed to process withdrawal');
    }
    setIsProcessing(false);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    if (!confirm(`Are you sure you want to reject this withdrawal? The amount will be refunded to the seller's wallet.`)) {
      return;
    }

    setIsProcessing(true);
    const result = await rejectWithdrawal(withdrawal.id, rejectionReason, adminNotes);
    
    if (result.success) {
      alert('Withdrawal rejected and amount refunded to seller wallet');
      onClose();
      window.location.reload();
    } else {
      alert(result.error || 'Failed to reject withdrawal');
    }
    setIsProcessing(false);
  };

  const handlePutOnHold = async () => {
    if (!holdReason.trim()) {
      alert('Please provide a reason for putting this withdrawal on hold');
      return;
    }

    setIsProcessing(true);
    const result = await putWithdrawalOnHold(withdrawal.id, holdReason);
    
    if (result.success) {
      alert('Withdrawal put on hold');
      onClose();
      window.location.reload();
    } else {
      alert(result.error || 'Failed to put withdrawal on hold');
    }
    setIsProcessing(false);
  };

  const handleResumeWithdrawal = async () => {
    if (!confirm('Resume this withdrawal and move it back to pending status?')) return;
    
    setIsProcessing(true);
    const result = await resumeWithdrawal(withdrawal.id);
    
    if (result.success) {
      alert('Withdrawal resumed and moved back to pending');
      onClose();
      window.location.reload();
    } else {
      alert(result.error || 'Failed to resume withdrawal');
    }
    setIsProcessing(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Withdrawal Request Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Amount Card */}
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 mb-1">Withdrawal Amount</p>
              <p className="text-4xl font-bold text-blue-600 mb-3">{formatPrice(amount)}</p>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Status: </span>
                  <Badge variant={withdrawal.status === 'pending' ? 'secondary' : 'outline'} className="capitalize">
                    {withdrawal.status === 'on_hold' ? 'On Hold' : withdrawal.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-600">Requested: </span>
                  <span className="font-medium">
                    {new Date(withdrawal.created_at).toLocaleDateString('en-NG', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warning Messages */}
          {hasWarnings && (
            <div className="space-y-2">
              {!seller?.is_verified && (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-900">Seller Not Verified</p>
                    <p className="text-sm text-yellow-700">This seller's account is not yet verified</p>
                  </div>
                </div>
              )}
              {!seller?.bank_verified && (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-900">Bank Account Not Verified</p>
                    <p className="text-sm text-yellow-700">The bank account details have not been verified</p>
                  </div>
                </div>
              )}
              {stats?.disputes > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">Active Disputes</p>
                    <p className="text-sm text-red-700">This seller has {stats.disputes} active dispute(s)</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Seller Info */}
            <div className="space-y-6">
              {/* Seller Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5" />
                    Seller Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Business Name</p>
                    <p className="font-semibold">{seller?.business_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Full Name</p>
                    <p className="font-medium">{seller?.full_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Email</p>
                    <p className="font-medium text-xs">{seller?.email}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-gray-500 mb-1">Phone</p>
                      <p className="font-medium">{seller?.phone_number || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 mb-1">State</p>
                      <p className="font-medium">{seller?.state}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">University</p>
                    <p className="font-medium">{seller?.university?.name || 'N/A'}</p>
                  </div>
                  <div className="pt-3 border-t flex gap-2">
                    {seller?.is_verified ? (
                      <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Verified
                      </Badge>
                    )}
                    {seller?.bank_verified ? (
                      <Badge className="bg-blue-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Bank Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Bank Not Verified
                      </Badge>
                    )}
                    {seller?.is_active ? (
                      <Badge className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Performance Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5" />
                    Performance Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Total Orders</p>
                      <p className="text-2xl font-bold text-blue-600">{stats?.totalOrders || 0}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Delivered</p>
                      <p className="text-2xl font-bold text-green-600">{stats?.deliveredOrders || 0}</p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats?.pendingOrders || 0}</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg">
                      <p className="text-xs text-gray-600 mb-1">Disputes</p>
                      <p className="text-2xl font-bold text-red-600">{stats?.disputes || 0}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-600 mb-1">Completion Rate</p>
                    <p className="text-lg font-bold text-gray-900">{stats?.completionRate || 0}%</p>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-1">Account Age</p>
                    <p className="text-sm font-medium text-gray-900">{stats?.accountAge || 0} days</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Bank & Wallet Info */}
            <div className="space-y-6">
              {/* Bank Account Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CreditCard className="h-5 w-5" />
                    Bank Account Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500 mb-1">Bank Name</p>
                    <p className="font-semibold">{withdrawal.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Account Number</p>
                    <p className="font-semibold font-mono text-lg">{withdrawal.account_number}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Account Name</p>
                    <p className="font-semibold">{withdrawal.account_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-1">Bank Code</p>
                    <p className="font-medium">{withdrawal.bank_code}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Current Wallet Balance */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Wallet className="h-5 w-5" />
                    Wallet Balance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Current Balance</p>
                    <p className="text-2xl font-bold text-gray-900">{formatPrice(currentBalance)}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-gray-600 mb-1">Balance After Withdrawal</p>
                    <p className="text-2xl font-bold text-blue-600">{formatPrice(balanceAfterWithdrawal)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Wallet Activity */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <History className="h-5 w-5" />
                    Recent Wallet Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {withdrawal.recentTransactions && withdrawal.recentTransactions.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {withdrawal.recentTransactions.map((txn: any, index: number) => (
                        <div key={index} className="flex justify-between items-start p-2 bg-gray-50 rounded text-xs">
                          <div className="flex-1">
                            <p className="font-medium capitalize">{txn.transaction_type}</p>
                            <p className="text-gray-500">
                              {new Date(txn.created_at).toLocaleDateString('en-NG')}
                            </p>
                          </div>
                          <p className={`font-bold ${parseFloat(txn.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {parseFloat(txn.amount) >= 0 ? '+' : ''}{formatPrice(parseFloat(txn.amount))}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No recent transactions</p>
                  )}
                </CardContent>
              </Card>

              {/* Previous Withdrawals */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="h-5 w-5" />
                    Previous Withdrawals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {withdrawal.previousWithdrawals && withdrawal.previousWithdrawals.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {withdrawal.previousWithdrawals.map((prev: any, index: number) => (
                        <div key={index} className="flex justify-between items-start p-2 bg-gray-50 rounded text-xs">
                          <div className="flex-1">
                            <Badge variant="outline" className="capitalize text-xs mb-1">
                              {prev.status}
                            </Badge>
                            <p className="text-gray-500">
                              {new Date(prev.created_at).toLocaleDateString('en-NG')}
                            </p>
                          </div>
                          <p className="font-bold text-gray-900">{formatPrice(parseFloat(prev.amount))}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No previous withdrawals</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Action Buttons */}
          {withdrawal.status === 'on_hold' ? (
            <div className="space-y-3">
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-orange-900">This withdrawal is currently on hold</p>
                    {withdrawal.admin_notes && (
                      <p className="text-sm text-orange-700 mt-1">Reason: {withdrawal.admin_notes}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleResumeWithdrawal}
                  disabled={isProcessing}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? 'Resuming...' : 'Resume to Pending'}
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? 'Processing...' : 'Approve & Process Now'}
                </Button>
                <Button
                  onClick={() => setShowRejectForm(!showRejectForm)}
                  disabled={isProcessing}
                  variant="destructive"
                  className="flex-1"
                >
                  Reject Withdrawal
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <Button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isProcessing ? 'Processing...' : 'Approve & Process'}
              </Button>
              <Button
                onClick={() => setShowHoldForm(!showHoldForm)}
                disabled={isProcessing}
                variant="outline"
                className="flex-1 border-yellow-500 text-yellow-700 hover:bg-yellow-50"
              >
                <Clock className="h-4 w-4 mr-2" />
                Put On Hold
              </Button>
              <Button
                onClick={() => setShowRejectForm(!showRejectForm)}
                disabled={isProcessing}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {/* Reject Form */}
          {showRejectForm && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-red-900 text-lg">Reject Withdrawal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason (Visible to Seller) *
                  </label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Enter reason for rejection..."
                    rows={3}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Admin Notes (Internal Only)
                  </label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Enter internal notes..."
                    rows={2}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleReject}
                    disabled={isProcessing || !rejectionReason.trim()}
                    variant="destructive"
                    className="flex-1"
                  >
                    {isProcessing ? 'Rejecting...' : 'Confirm Rejection'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectionReason('');
                      setAdminNotes('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hold Form */}
          {showHoldForm && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-yellow-900 text-lg">Put Withdrawal On Hold</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Hold Reason (Visible to Seller) *
                  </label>
                  <Textarea
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    placeholder="Enter reason for holding..."
                    rows={3}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handlePutOnHold}
                    disabled={isProcessing || !holdReason.trim()}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                  >
                    {isProcessing ? 'Processing...' : 'Confirm Hold'}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowHoldForm(false);
                      setHoldReason('');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}