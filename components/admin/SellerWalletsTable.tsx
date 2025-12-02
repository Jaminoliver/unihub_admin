'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Wallet, TrendingUp, TrendingDown, 
  Calendar, Eye, AlertCircle, CheckCircle, XCircle 
} from 'lucide-react';
import { SellerWalletDetailsModal } from './SellerWalletDetailsModal';

interface SellerWalletsTableProps {
  sellers: any[];
}

export function SellerWalletsTable({ sellers }: SellerWalletsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<any>(null);

  console.log('Sellers received:', sellers.length); // Debug log

  const filteredSellers = sellers.filter(seller => {
    const search = searchTerm.toLowerCase();
    return (
      seller.business_name?.toLowerCase().includes(search) ||
      seller.full_name?.toLowerCase().includes(search) ||
      seller.email?.toLowerCase().includes(search)
    );
  });

  const formatPrice = (amount: number) => 
    `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const totalWalletBalance = sellers.reduce(
    (sum, s) => sum + parseFloat(s.wallet_balance || '0'), 
    0
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Seller Wallets Overview
              </CardTitle>
              <CardDescription className="text-sm">
                View all seller wallet balances and transaction history
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Total Balance</p>
              <p className="text-2xl font-bold text-blue-600">{formatPrice(totalWalletBalance)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by business name, seller name, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          {/* Compact Sellers Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Earned</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Withdrawn</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Pending</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-white">
                  {filteredSellers.length > 0 ? (
                    filteredSellers.map((seller) => {
                      const stats = seller.walletStats || {};
                      const balance = parseFloat(seller.wallet_balance || '0');

                      return (
                        <tr key={seller.id} className="hover:bg-gray-50">
                          {/* Seller Info */}
                          <td className="px-3 py-2">
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{seller.business_name || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{seller.full_name}</p>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-2">
                            {seller.is_verified ? (
                              <Badge variant="default" className="text-xs h-5">
                                <CheckCircle className="h-2.5 w-2.5 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="text-xs h-5">
                                <XCircle className="h-2.5 w-2.5 mr-1" />
                                Unverified
                              </Badge>
                            )}
                          </td>

                          {/* Wallet Balance */}
                          <td className="px-3 py-2 text-right">
                            <p className={`font-semibold text-sm ${balance > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                              {formatPrice(balance)}
                            </p>
                          </td>

                          {/* Total Earned */}
                          <td className="px-3 py-2 text-right">
                            <span className="text-sm text-gray-700">
                              {formatPrice(stats.totalEarned || 0)}
                            </span>
                          </td>

                          {/* Total Withdrawn */}
                          <td className="px-3 py-2 text-right">
                            <span className="text-sm text-gray-700">
                              {formatPrice(stats.totalWithdrawn || 0)}
                            </span>
                          </td>

                          {/* Pending Withdrawals */}
                          <td className="px-3 py-2 text-center">
                            {stats.pendingWithdrawals > 0 ? (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300 text-xs h-5">
                                {stats.pendingWithdrawals}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>

                          {/* Last Withdrawal */}
                          <td className="px-3 py-2">
                            {stats.lastWithdrawalDate ? (
                              <span className="text-xs text-gray-600">
                                {new Date(stats.lastWithdrawalDate).toLocaleDateString('en-NG', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Never</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-2 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedSeller(seller)}
                              className="h-7 text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-3 py-12">
                        <div className="text-center">
                          <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">
                            {searchTerm ? 'No sellers found matching your search' : 'No sellers found'}
                          </p>
                          {sellers.length === 0 && (
                            <p className="text-xs text-gray-400 mt-1">
                              Debug: Check console for data loading issues
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compact Summary Stats */}
          <div className="grid grid-cols-4 gap-3 pt-3">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">{sellers.length}</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-500">Active</p>
              <p className="text-xl font-bold text-green-600">
                {sellers.filter(s => s.is_active).length}
              </p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-500">Verified</p>
              <p className="text-xl font-bold text-blue-600">
                {sellers.filter(s => s.is_verified).length}
              </p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <p className="text-xs text-gray-500">Pending</p>
              <p className="text-xl font-bold text-yellow-600">
                {sellers.filter(s => s.walletStats?.pendingWithdrawals > 0).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wallet Details Modal */}
      <SellerWalletDetailsModal 
        seller={selectedSeller}
        isOpen={!!selectedSeller}
        onClose={() => setSelectedSeller(null)}
      />
    </>
  );
}