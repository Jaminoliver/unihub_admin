'use client';

import { useState } from 'react';
import { Search, Filter, Eye, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Transaction {
  id: string;
  user_id: string;
  order_id: string | null;
  transaction_type: string;
  amount: string;
  status: string;
  payment_provider: string | null;
  payment_reference: string | null;
  metadata: any;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
  order?: {
    id: string;
    order_number: string;
    seller_id: string;
    product_id: string;
    seller?: {
      id: string;
      business_name: string;
      full_name: string;
      email: string;
    };
    product?: {
      id: string;
      name: string;
    };
  } | null;
}

interface TransactionsTableProps {
  transactions: Transaction[];
}

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter transactions
  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch = 
      txn.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      txn.user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || txn.transaction_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || txn.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const formatPrice = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₦${numAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
  };

  const getTypeBadge = (type: string) => {
    const badges = {
      payment: { label: 'Payment', class: 'bg-green-100 text-green-700 border-green-200' },
      refund: { label: 'Refund', class: 'bg-red-100 text-red-700 border-red-200' },
      payout: { label: 'Payout', class: 'bg-blue-100 text-blue-700 border-blue-200' },
      withdrawal: { label: 'Withdrawal', class: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
      commission: { label: 'Commission', class: 'bg-purple-100 text-purple-700 border-purple-200' },
    };
    const badge = badges[type as keyof typeof badges] || { label: type, class: 'bg-gray-100 text-gray-700' };
    return <Badge variant="outline" className={badge.class}>{badge.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      success: { label: 'Success', class: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      pending: { label: 'Pending', class: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      failed: { label: 'Failed', class: 'bg-red-100 text-red-700 border-red-200' },
    };
    const badge = badges[status as keyof typeof badges] || { label: status, class: 'bg-gray-100 text-gray-700' };
    return <Badge variant="outline" className={badge.class}>{badge.label}</Badge>;
  };

  const getStatusIcon = (type: string) => {
    return type === 'payment' ? (
      <ArrowDownRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowUpRight className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search reference, order, email, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Types</option>
            <option value="payment">Payments</option>
            <option value="refund">Refunds</option>
            <option value="payout">Payouts</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="commission">Commissions</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="success">Successful</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-mono text-gray-900">{txn.payment_reference || 'N/A'}</p>
                      {txn.payment_provider && (
                        <p className="text-xs text-gray-500 mt-1">{txn.payment_provider}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {txn.order?.order_number ? (
                        <p className="text-sm font-medium text-blue-600">{txn.order.order_number}</p>
                      ) : (
                        <p className="text-sm text-gray-400">-</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {txn.user?.full_name || 'N/A'}
                        </p>
                        <p className="text-xs text-gray-500">{txn.user?.email || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-900 truncate max-w-xs">
                          {txn.order?.product?.name || '-'}
                        </p>
                        {txn.order?.seller && (
                          <p className="text-xs text-gray-500 truncate max-w-xs">
                            by {txn.order.seller.business_name || txn.order.seller.full_name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(txn.transaction_type)}
                        {getTypeBadge(txn.transaction_type)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(txn.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className={`text-sm font-bold ${
                        txn.transaction_type === 'refund' || txn.transaction_type === 'withdrawal' 
                          ? 'text-red-600' 
                          : 'text-green-600'
                      }`}>
                        {txn.transaction_type === 'refund' || txn.transaction_type === 'withdrawal' ? '-' : '+'}
                        {formatPrice(txn.amount)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">
                        {new Date(txn.created_at).toLocaleDateString('en-NG', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
        Showing {filteredTransactions.length} of {transactions.length} transactions
      </div>
    </div>
  );
}