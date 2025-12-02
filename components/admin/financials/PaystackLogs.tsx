'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PaystackLogs({ orders }: { orders: any[] }) {
  const [search, setSearch] = useState('');

  const filteredOrders = orders.filter(order =>
    order.paystack_reference?.toLowerCase().includes(search.toLowerCase()) ||
    order.id?.toLowerCase().includes(search.toLowerCase()) ||
    order.buyer?.email?.toLowerCase().includes(search.toLowerCase())
  );

  const successfulPayments = orders.filter(o => o.payment_status === 'paid').length;
  const failedPayments = orders.filter(o => o.payment_status === 'failed').length;
  const totalAmount = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0);

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{orders.length.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Successful</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{successfulPayments.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{failedPayments.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by reference, order ID, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-blue-600">
                      {order.paystack_reference || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">
                      {order.id?.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium">{order.buyer?.full_name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{order.buyer?.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {formatPrice(parseFloat(order.total_amount || '0'))}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge
                        variant={
                          order.payment_status === 'paid'
                            ? 'default'
                            : order.payment_status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {order.payment_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Badge variant="outline">{order.payment_method || 'N/A'}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}