'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle, Clock, XCircle } from 'lucide-react';

interface CommissionReportsProps {
  orders: any[];
  earnedCommission: number;
  pendingCommission: number;
  refundedCommission: number;
  earnedCount: number;
  pendingCount: number;
  refundedCount: number;
}

type OrderTab = 'all' | 'earned' | 'pending' | 'refunded';
type DateRange = 'all' | 'today' | 'week' | 'month';

export function CommissionReports({ 
  orders,
  earnedCommission,
  pendingCommission,
  refundedCommission,
  earnedCount,
  pendingCount,
  refundedCount
}: CommissionReportsProps) {
  const [activeTab, setActiveTab] = useState<OrderTab>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  // Filter orders by tab
  const getFilteredOrders = () => {
    let filtered = orders;

    // Filter by tab
    if (activeTab === 'earned') {
      filtered = filtered.filter(o => o.order_status === 'delivered');
    } else if (activeTab === 'pending') {
      filtered = filtered.filter(o => o.order_status === 'pending');
    } else if (activeTab === 'refunded') {
      filtered = filtered.filter(o => o.order_status === 'refunded');
    } else {
      // 'all' tab shows delivered + refunded (not pending)
      filtered = filtered.filter(o => o.order_status === 'delivered' || o.order_status === 'refunded');
    }

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        if (dateRange === 'today') {
          return orderDate.toDateString() === now.toDateString();
        }
        if (dateRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return orderDate >= weekAgo;
        }
        if (dateRange === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return orderDate >= monthAgo;
        }
        return true;
      });
    }

    return filtered;
  };

  const filteredOrders = getFilteredOrders();

  // Calculate stats for current filtered view
  const totalCommission = filteredOrders.reduce((sum, o) => sum + parseFloat(o.commission_amount || '0'), 0);
  const totalOrders = filteredOrders.length;
  const avgCommission = totalOrders > 0 ? totalCommission / totalOrders : 0;

  const byPaymentMethod = filteredOrders.reduce((acc: any, order) => {
    const method = order.payment_method || 'unknown';
    if (!acc[method]) acc[method] = { count: 0, commission: 0 };
    acc[method].count++;
    acc[method].commission += parseFloat(order.commission_amount || '0');
    return acc;
  }, {});

  const byState = filteredOrders.reduce((acc: any, order) => {
    const state = order.buyer?.state || 'Unknown';
    if (!acc[state]) acc[state] = { count: 0, commission: 0 };
    acc[state].count++;
    acc[state].commission += parseFloat(order.commission_amount || '0');
    return acc;
  }, {});

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  const getOrderStatusBadge = (order: any) => {
    if (order.order_status === 'delivered') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Earned
      </span>;
    }
    if (order.order_status === 'pending') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </span>;
    }
    if (order.order_status === 'refunded') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircle className="w-3 h-3 mr-1" />
        Refunded
      </span>;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Earned Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{formatPrice(earnedCommission)}</p>
            <p className="text-sm text-gray-600 mt-1">{earnedCount} orders</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{formatPrice(pendingCommission)}</p>
            <p className="text-sm text-gray-600 mt-1">{pendingCount} orders awaiting delivery</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Refunded Commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{formatPrice(refundedCommission)}</p>
            <p className="text-sm text-gray-600 mt-1">{refundedCount} orders</p>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('all')}
              >
                All ({earnedCount + refundedCount})
              </Button>
              <Button
                variant={activeTab === 'earned' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('earned')}
                className={activeTab === 'earned' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Earned ({earnedCount})
              </Button>
              <Button
                variant={activeTab === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('pending')}
                className={activeTab === 'pending' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
              >
                Pending ({pendingCount})
              </Button>
              <Button
                variant={activeTab === 'refunded' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('refunded')}
                className={activeTab === 'refunded' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                Refunded ({refundedCount})
              </Button>
            </div>
          </div>

          {/* Date Range Filters */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {(['all', 'today', 'week', 'month'] as DateRange[]).map(range => (
                <Button
                  key={range}
                  variant={dateRange === range ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateRange(range)}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatPrice(totalCommission)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalOrders.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Avg Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatPrice(avgCommission)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Commission by Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(byPaymentMethod).map(([method, data]: [string, any]) => (
                <div key={method} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">{method}</p>
                    <p className="text-sm text-gray-600">{data.count} orders</p>
                  </div>
                  <p className="font-bold">{formatPrice(data.commission)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Commission by State (Top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(byState)
                .sort((a: any, b: any) => b[1].commission - a[1].commission)
                .slice(0, 10)
                .map(([state, data]: [string, any]) => (
                  <div key={state} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{state}</p>
                      <p className="text-sm text-gray-600">{data.count} orders</p>
                    </div>
                    <p className="font-bold">{formatPrice(data.commission)}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Order #</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Method</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredOrders.slice(0, 50).map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-2 text-sm font-mono">{order.order_number}</td>
                    <td className="px-4 py-2 text-sm">{formatPrice(parseFloat(order.total_amount || '0'))}</td>
                    <td className="px-4 py-2 text-sm capitalize">{order.payment_method}</td>
                    <td className="px-4 py-2 text-sm">{getOrderStatusBadge(order)}</td>
                    <td className={`px-4 py-2 text-sm font-bold ${
                      order.order_status === 'refunded' ? 'text-red-600 line-through' : 
                      order.order_status === 'pending' ? 'text-yellow-600' : 
                      'text-green-600'
                    }`}>
                      {formatPrice(parseFloat(order.commission_amount || '0'))}
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