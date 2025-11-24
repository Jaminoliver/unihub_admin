'use client';

import { X, User, Store, Mail, Phone, MapPin, Calendar, ShoppingCart, Package, Wallet, Shield } from 'lucide-react';

type UserDetails = {
  id: string;
  full_name?: string | null;
  business_name?: string | null;
  email: string;
  phone_number?: string | null;
  state?: string | null;
  created_at: string;
  account_status: string;
  approval_status?: string;
  bank_verified?: boolean;
  wallet_balance?: string;
  university?: { name: string; state: string } | null;
  orders?: Array<{
    id: string;
    order_number: string;
    total_amount: string;
    order_status: string;
    created_at: string;
  }>;
  products?: Array<{
    id: string;
    name: string;
    price: string;
    approval_status: string;
    is_available: boolean;
    created_at: string;
  }>;
};

interface UserDetailModalProps {
  user: UserDetails;
  userType: 'buyer' | 'seller';
  onClose: () => void;
}

export function UserDetailModal({ user, userType, onClose }: UserDetailModalProps) {
  const formatPrice = (price: string | number) => {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numericPrice)) return '₦0.00';
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(numericPrice);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      banned: 'bg-red-100 text-red-800',
      suspended: 'bg-orange-100 text-orange-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {userType === 'seller' ? 'Seller Details' : 'Buyer Details'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                {userType === 'seller' ? <Store className="h-5 w-5" /> : <User className="h-5 w-5" />}
                Basic Information
              </h4>
              <dl className="space-y-2 text-sm">
                {userType === 'seller' && user.business_name && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Business Name:</dt>
                    <dd className="font-medium">{user.business_name}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-600">Full Name:</dt>
                  <dd className="font-medium">{user.full_name || 'N/A'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Email:</dt>
                  <dd className="font-medium text-blue-600">{user.email}</dd>
                </div>
                {user.phone_number && (
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Phone:</dt>
                    <dd className="font-medium">{user.phone_number}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-600">State:</dt>
                  <dd className="font-medium">{user.state || 'N/A'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">University:</dt>
                  <dd className="font-medium">{user.university?.name || 'N/A'}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Status
              </h4>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <dt className="text-gray-600">Account Status:</dt>
                  <dd>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(user.account_status)}`}>
                      {user.account_status}
                    </span>
                  </dd>
                </div>
                {userType === 'seller' && user.approval_status && (
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-600">Approval Status:</dt>
                    <dd>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(user.approval_status)}`}>
                        {user.approval_status}
                      </span>
                    </dd>
                  </div>
                )}
                {userType === 'seller' && (
                  <>
                    <div className="flex justify-between items-center">
                      <dt className="text-gray-600">Bank Verified:</dt>
                      <dd className={user.bank_verified ? 'text-green-600 font-medium' : 'text-gray-400'}>
                        {user.bank_verified ? '✓ Verified' : 'Not verified'}
                      </dd>
                    </div>
                    {user.wallet_balance && (
                      <div className="flex justify-between border-t pt-2">
                        <dt className="text-gray-600">Wallet Balance:</dt>
                        <dd className="font-semibold text-lg">{formatPrice(user.wallet_balance)}</dd>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between">
                  <dt className="text-gray-600">Joined:</dt>
                  <dd className="font-medium">{new Date(user.created_at).toLocaleDateString('en-GB')}</dd>
                </div>
              </dl>
            </div>
          </div>

          {user.orders && user.orders.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Recent Orders ({user.orders.length})
              </h4>
              <div className="space-y-2">
                {user.orders.map((order) => (
                  <div key={order.id} className="bg-white rounded p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{order.order_number}</p>
                      <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatPrice(order.total_amount)}</p>
                      <p className="text-xs text-gray-500 capitalize">{order.order_status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {userType === 'seller' && user.products && user.products.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Recent Products ({user.products.length})
              </h4>
              <div className="space-y-2">
                {user.products.map((product) => (
                  <div key={product.id} className="bg-white rounded p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">{new Date(product.created_at).toLocaleDateString('en-GB')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatPrice(product.price)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(product.approval_status)}`}>
                        {product.approval_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}