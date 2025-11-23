'use client';

import { formatDistanceToNow } from 'date-fns';
import { ShoppingBag, UserPlus, Package, TrendingUp } from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  total_amount: string;
  order_status: string;
  payment_status: string;
  created_at: string;
  buyer: { full_name: string; email: string } | null;
  seller: { business_name: string } | null;
  product: { name: string } | null;
}

interface User {
  full_name: string;
  email: string;
  created_at: string;
  is_seller: boolean;
}

interface Props {
  recentOrders: Order[];
  recentUsers: User[];
}

export function EnhancedRecentActivity({ recentOrders, recentUsers }: Props) {
  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
      unpaid: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                <p className="text-sm text-gray-500">Latest 10 orders</p>
              </div>
            </div>
            <a
              href="/admin/orders"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all →
            </a>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {recentOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No orders yet</p>
            </div>
          ) : (
            recentOrders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {order.product?.name || 'Product'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Order #{order.order_number}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 ml-4">
                    ₦{parseFloat(order.total_amount).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.order_status)}`}>
                      {order.order_status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.payment_status)}`}>
                      {order.payment_status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                  </p>
                </div>

                <div className="mt-2 text-xs text-gray-600">
                  <span className="font-medium">{order.buyer?.full_name}</span> from{' '}
                  <span className="font-medium">{order.seller?.business_name}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Users */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserPlus className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Recent Signups</h2>
                <p className="text-sm text-gray-500">New users joining</p>
              </div>
            </div>
            <a
              href="/admin/users"
              className="text-sm font-medium text-green-600 hover:text-green-700"
            >
              View all →
            </a>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {recentUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <UserPlus className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No new users yet</p>
            </div>
          ) : (
            recentUsers.map((user) => (
              <div key={user.email} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {user.full_name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {user.email}
                    </p>
                  </div>
                  <span className={`ml-4 px-2 py-1 text-xs font-medium rounded-full ${
                    user.is_seller 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.is_seller ? 'Seller' : 'Buyer'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}