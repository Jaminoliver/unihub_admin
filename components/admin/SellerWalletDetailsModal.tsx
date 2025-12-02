'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Wallet, TrendingUp, TrendingDown, CreditCard, 
  History, DollarSign, Calendar, Building2, User,
  Mail, Phone, MapPin, University, CheckCircle, 
  XCircle, Clock, AlertTriangle, X, ArrowLeft
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';

interface SellerWalletDetailsModalProps {
  seller: any;
  isOpen: boolean;
  onClose: () => void;
}

export function SellerWalletDetailsModal({ seller, isOpen, onClose }: SellerWalletDetailsModalProps) {
  const [walletTransactions, setWalletTransactions] = useState<any[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && seller) {
      fetchSellerDetails();
    }
  }, [isOpen, seller]);

  const fetchSellerDetails = async () => {
    setLoading(true);
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: transactions } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false });

    const { data: withdrawals } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('seller_id', seller.id)
      .order('created_at', { ascending: false });

    setWalletTransactions(transactions || []);
    setAllWithdrawals(withdrawals || []);
    setLoading(false);
  };

  if (!seller || !isOpen) return null;

  const stats = seller.walletStats;
  const balance = parseFloat(seller.wallet_balance || '0');

  const formatPrice = (amount: number) => 
    `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  const getStatusBadge = (status: string) => {
    const config = {
      completed: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-yellow-600' },
      processing: { variant: 'secondary' as const, icon: Clock, color: 'text-blue-600' },
      failed: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
      rejected: { variant: 'secondary' as const, icon: XCircle, color: 'text-gray-600' },
      on_hold: { variant: 'secondary' as const, icon: AlertTriangle, color: 'text-orange-600' }
    };

    const { variant, icon: Icon, color } = config[status as keyof typeof config] || config.pending;

    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        <Icon className={`h-3 w-3 ${color}`} />
        <span className="text-xs">{status}</span>
      </Badge>
    );
  };

  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      credit: 'text-green-600',
      debit: 'text-red-600',
      withdrawal: 'text-blue-600',
      refund: 'text-purple-600',
      commission: 'text-orange-600'
    };
    return colors[type] || 'text-gray-600';
  };

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Seller Wallet Details</h1>
              <p className="text-sm text-gray-500">{seller.business_name}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-6 overflow-y-auto" style={{ height: 'calc(100vh - 73px)' }}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Seller Info & Balance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Seller Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Seller Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Business Name</p>
                      <p className="font-semibold">{seller.business_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Full Name</p>
                      <p className="font-semibold">{seller.full_name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Email</p>
                      <p className="font-medium text-sm">{seller.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Phone</p>
                      <p className="font-medium">{seller.phone_number || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">State</p>
                      <p className="font-medium">{seller.state}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">University</p>
                      <p className="font-medium">{seller.university?.name || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="pt-3 border-t flex gap-2">
                    {seller.is_verified ? (
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
                    {seller.bank_verified ? (
                      <Badge className="bg-blue-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Bank Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Bank Not Verified
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Wallet Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Wallet Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Current Balance</p>
                    <p className="text-4xl font-bold text-blue-600">{formatPrice(balance)}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <p className="text-sm text-gray-600">Total Earned</p>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {formatPrice(stats?.totalEarned || 0)}
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="h-4 w-4 text-blue-600" />
                        <p className="text-sm text-gray-600">Total Withdrawn</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatPrice(stats?.totalWithdrawn || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-500 mb-1">Pending Withdrawals</p>
                      <p className="text-xl font-semibold">{stats?.pendingWithdrawals || 0}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <p className="text-sm text-gray-500 mb-1">Total Transactions</p>
                      <p className="text-xl font-semibold">{stats?.transactionCount || 0}</p>
                    </div>
                  </div>

                  {stats?.lastWithdrawalDate && (
                    <div className="pt-3 border-t">
                      <p className="text-sm text-gray-500 mb-1">Last Withdrawal</p>
                      <p className="font-medium">
                        {new Date(stats.lastWithdrawalDate).toLocaleDateString('en-NG', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bank Account Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Bank Account Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Bank Name</p>
                    <p className="font-semibold">{seller.bank_name || 'Not Set'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Account Number</p>
                    <p className="font-semibold font-mono">{seller.bank_account_number || 'Not Set'}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Account Name</p>
                    <p className="font-semibold">{seller.account_name || 'Not Set'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transactions" className="flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Wallet Transactions ({walletTransactions.length})
                </TabsTrigger>
                <TabsTrigger value="withdrawals" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Withdrawal History ({allWithdrawals.length})
                </TabsTrigger>
              </TabsList>

              {/* Wallet Transactions */}
              <TabsContent value="transactions" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Complete Transaction History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {walletTransactions.length === 0 ? (
                      <div className="text-center py-12">
                        <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No transactions yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {walletTransactions.map((txn) => (
                          <div key={txn.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="capitalize">
                                  {txn.transaction_type}
                                </Badge>
                                <span className="text-sm text-gray-500">{txn.reference}</span>
                              </div>
                              <p className="font-medium text-gray-900">{txn.description}</p>
                              <p className="text-sm text-gray-500 mt-1">
                                {new Date(txn.created_at).toLocaleString('en-NG')}
                              </p>
                            </div>
                            <div className="text-right ml-6">
                              <p className={`text-2xl font-bold ${getTransactionTypeColor(txn.transaction_type)}`}>
                                {parseFloat(txn.amount) >= 0 ? '+' : ''}{formatPrice(parseFloat(txn.amount))}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                Balance: {formatPrice(parseFloat(txn.balance_after))}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Withdrawals */}
              <TabsContent value="withdrawals" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Complete Withdrawal History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {allWithdrawals.length === 0 ? (
                      <div className="text-center py-12">
                        <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No withdrawals yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {allWithdrawals.map((withdrawal) => (
                          <div key={withdrawal.id} className="border rounded-lg p-4 hover:bg-gray-50">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                {getStatusBadge(withdrawal.status)}
                                <p className="text-sm text-gray-500 mt-1">
                                  Requested: {new Date(withdrawal.created_at).toLocaleString('en-NG')}
                                </p>
                              </div>
                              <p className="text-2xl font-bold text-gray-900">
                                {formatPrice(parseFloat(withdrawal.amount))}
                              </p>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="p-3 bg-gray-50 rounded">
                                <p className="text-xs text-gray-500 mb-1">Bank</p>
                                <p className="font-medium">{withdrawal.bank_name}</p>
                              </div>
                              <div className="p-3 bg-gray-50 rounded">
                                <p className="text-xs text-gray-500 mb-1">Account</p>
                                <p className="font-medium font-mono">{withdrawal.account_number}</p>
                              </div>
                              <div className="p-3 bg-gray-50 rounded">
                                <p className="text-xs text-gray-500 mb-1">Name</p>
                                <p className="font-medium">{withdrawal.account_name}</p>
                              </div>
                            </div>

                            {withdrawal.processed_at && (
                              <p className="text-sm text-gray-500 mt-3">
                                Processed: {new Date(withdrawal.processed_at).toLocaleString('en-NG')}
                                {withdrawal.paystack_transfer_code && (
                                  <span className="ml-2">• Code: {withdrawal.paystack_transfer_code}</span>
                                )}
                              </p>
                            )}

                            {withdrawal.rejected_at && (
                              <div className="mt-3 p-3 bg-gray-50 rounded">
                                <p className="font-semibold text-gray-700 mb-1">Rejected</p>
                                <p className="text-sm text-gray-600">{withdrawal.rejected_reason}</p>
                                {withdrawal.admin_notes && (
                                  <p className="text-xs text-gray-500 mt-1">Notes: {withdrawal.admin_notes}</p>
                                )}
                              </div>
                            )}

                            {withdrawal.failure_reason && (
                              <div className="mt-3 p-3 bg-red-50 rounded">
                                <p className="font-semibold text-red-700 mb-1">Failed</p>
                                <p className="text-sm text-red-600">{withdrawal.failure_reason}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}