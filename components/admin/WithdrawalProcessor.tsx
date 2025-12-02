'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useState } from 'react';
import { processAllWithdrawals } from '@/app/admin/dashboard/withdrawals/actions';
import { WithdrawalDetailsModal } from './WithdrawalDetailsModal';
import { 
  Eye, Clock, AlertTriangle, CheckCircle, XCircle, 
  Building2, Wallet, TrendingUp, Shield 
} from 'lucide-react';

interface Withdrawal {
  id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  created_at: string;
  seller: any;
  sellerStats?: any;
  recentTransactions?: any[];
  previousWithdrawals?: any[];
}

interface WithdrawalProcessorProps {
  withdrawals: Withdrawal[];
}

export function WithdrawalProcessor({ withdrawals }: WithdrawalProcessorProps) {
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);
  const [processingAll, setProcessingAll] = useState(false);

  const handleProcessAll = async () => {
    if (!confirm(`Are you sure you want to process all ${withdrawals.length} withdrawals?`)) {
      return;
    }

    setProcessingAll(true);

    try {
      const withdrawalIds = withdrawals.map(w => w.id);
      const result = await processAllWithdrawals(withdrawalIds);

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.warning(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process withdrawals');
    } finally {
      setProcessingAll(false);
    }
  };

  const formatPrice = (amount: number) => 
    `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  const getVerificationStatus = (seller: any) => {
    const issues = [];
    if (!seller.is_verified) issues.push('Not Verified');
    if (!seller.bank_verified) issues.push('Bank Not Verified');
    if (!seller.is_active) issues.push('Inactive');
    return issues;
  };

  if (withdrawals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Withdrawals</CardTitle>
          <CardDescription>No pending withdrawal requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-16 w-16 text-green-300 mb-3" />
            <p className="text-xl font-semibold text-gray-700">All caught up!</p>
            <p className="text-gray-500 mt-1">No pending withdrawals to process</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalAmount = withdrawals.reduce((sum, w) => sum + parseFloat(w.amount.toString()), 0);
  const withdrawalsWithIssues = withdrawals.filter(w => getVerificationStatus(w.seller).length > 0);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Pending Withdrawals</CardTitle>
              <CardDescription className="mt-2">
                {withdrawals.length} request{withdrawals.length !== 1 ? 's' : ''} totaling {formatPrice(totalAmount)}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {withdrawalsWithIssues.length > 0 && (
                <Badge variant="destructive" className="h-fit">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {withdrawalsWithIssues.length} Need Review
                </Badge>
              )}
              <Button 
                onClick={handleProcessAll} 
                disabled={processingAll}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                {processingAll ? 'Processing All...' : `Process All (${withdrawals.length})`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {withdrawals.map((withdrawal) => {
              const seller = withdrawal.seller;
              const stats = withdrawal.sellerStats;
              const issues = getVerificationStatus(seller);
              const hasIssues = issues.length > 0;
              const hasDisputes = stats?.disputes > 0;

              return (
                <div 
                  key={withdrawal.id} 
                  className={`border rounded-xl p-5 hover:shadow-md transition-all ${
                    hasIssues || hasDisputes ? 'border-yellow-300 bg-yellow-50/30' : 'hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    {/* Left Section - Seller Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg">
                          <Building2 className="h-6 w-6 text-blue-600" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {seller.business_name || seller.full_name}
                            </h3>
                            {hasIssues && (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Needs Review
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mb-3">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Wallet className="h-4 w-4" />
                              <span>Balance: {formatPrice(parseFloat(seller.wallet_balance))}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <TrendingUp className="h-4 w-4" />
                              <span>{stats?.totalOrders || 0} orders</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Shield className="h-4 w-4" />
                              <span>
                                {seller.is_verified ? (
                                  <span className="text-green-600 font-medium">Verified</span>
                                ) : (
                                  <span className="text-red-600 font-medium">Not Verified</span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock className="h-4 w-4" />
                              <span>{stats?.accountAge || 0} days old</span>
                            </div>
                          </div>

                          <div className="text-sm text-gray-600">
                            <p className="font-medium text-gray-700 mb-1">Bank Details:</p>
                            <p>{withdrawal.bank_name} • {withdrawal.account_number}</p>
                            <p className="text-xs text-gray-500 mt-1">{withdrawal.account_name}</p>
                          </div>

                          {/* Issues Warning */}
                          {(hasIssues || hasDisputes) && (
                            <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                              <p className="text-sm font-medium text-yellow-800 mb-1">⚠️ Review Required:</p>
                              <ul className="text-xs text-yellow-700 space-y-0.5">
                                {issues.map((issue, idx) => (
                                  <li key={idx}>• {issue}</li>
                                ))}
                                {hasDisputes && <li>• {stats.disputes} active dispute(s)</li>}
                              </ul>
                            </div>
                          )}

                          <p className="text-xs text-gray-400 mt-3">
                            Requested: {new Date(withdrawal.created_at).toLocaleString('en-NG')}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Amount & Actions */}
                    <div className="text-right ml-6">
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 mb-1">Withdrawal Amount</p>
                        <p className="text-3xl font-bold text-green-600">
                          {formatPrice(parseFloat(withdrawal.amount.toString()))}
                        </p>
                      </div>

                      <Button
                        onClick={() => setSelectedWithdrawal(withdrawal)}
                        size="lg"
                        className="w-full"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review Details
                      </Button>

                      {stats && (
                        <div className="mt-3 text-xs text-gray-500">
                          <p>Completion: {stats.completionRate}%</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <WithdrawalDetailsModal 
        withdrawal={selectedWithdrawal}
        isOpen={!!selectedWithdrawal}
        onClose={() => setSelectedWithdrawal(null)}
      />
    </>
  );
}