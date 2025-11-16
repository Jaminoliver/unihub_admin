'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RecentActivityProps {
  recentOrders: any[];
  recentUsers: any[];
}

export function RecentActivity({ recentOrders, recentUsers }: RecentActivityProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Latest Transactions</CardTitle>
          <CardDescription>Most recent orders on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No orders yet</p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{order.order_number}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {order.buyer?.full_name} → {order.seller?.business_name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{order.product?.name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-4">
                    <p className="font-bold text-gray-900">
                      ₦{parseFloat(order.total_amount).toLocaleString('en-NG')}
                    </p>
                    <Badge variant={
                      order.payment_status === 'completed' ? 'default' : 
                      order.payment_status === 'pending' ? 'secondary' : 
                      'destructive'
                    }>
                      {order.payment_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Users */}
      <Card>
        <CardHeader>
          <CardTitle>Latest User Signups</CardTitle>
          <CardDescription>Most recent platform registrations</CardDescription>
        </CardHeader>
        <CardContent>
          {recentUsers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No users yet</p>
          ) : (
            <div className="space-y-4">
              {recentUsers.map((user) => (
                <div key={user.email} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{user.full_name || 'No name'}</p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(user.created_at).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Badge variant={user.is_seller ? 'default' : 'secondary'}>
                    {user.is_seller ? 'Seller' : 'Buyer'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}