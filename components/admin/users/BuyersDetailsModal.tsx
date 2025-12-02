'use client';

import { useEffect, useState } from 'react';
import { X, User, ShoppingBag, MapPin, Activity, CreditCard, Package, Phone, Mail, Shield, AlertTriangle } from 'lucide-react';
import { getBuyerDetails } from '@/app/admin/dashboard/users/actions';

interface BuyerDetailsModalProps {
  user: any;
  userType: 'buyer' | 'seller';
  onClose: () => void;
}

export default function BuyerDetailsModal({ user, userType, onClose }: BuyerDetailsModalProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDetails = async () => {
      setLoading(true);
      try {
        const result = await getBuyerDetails(user.id);
        console.log('📦 Full result from getBuyerDetails:', result);
        console.log('📦 Orders array:', result.orders);
        console.log('📦 Orders length:', result.orders?.length);
        console.log('📦 Transactions array:', result.transactions);
        console.log('📦 Addresses array:', result.addresses);
        setDetails(result);
      } catch (error) {
        console.error('❌ Error loading details:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [user.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (amount: string | number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(parseFloat(amount.toString()));

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      banned: 'bg-red-100 text-red-800',
      suspended: 'bg-orange-100 text-orange-800',
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      refunded: 'bg-red-100 text-red-800',
      success: 'bg-green-100 text-green-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'transactions', label: 'Transactions', icon: CreditCard },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];

  const buyer = details?.buyer || user;
  const orders = Array.isArray(details?.orders) ? details.orders : [];
  const transactions = Array.isArray(details?.transactions) ? details.transactions : [];
  const addresses = Array.isArray(details?.addresses) ? details.addresses : [];
  
  console.log('🔍 Rendering with orders:', orders);
  console.log('🔍 Rendering with transactions:', transactions);
  console.log('🔍 Rendering with addresses:', addresses);
  
  const statistics = details?.statistics || {
    totalOrders: orders.length,
    completedOrders: 0,
    pendingOrders: 0,
    totalSpent: 0,
    averageOrderValue: 0
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold">
              {buyer.full_name?.[0] || 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{buyer.full_name || 'No Name'}</h2>
              <p className="text-sm text-gray-600">{buyer.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 bg-gray-50 px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 bg-white'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : (
            <>
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* Account Status Card */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      Account Status
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(buyer.account_status)}`}>
                          {buyer.account_status}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Verified</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {buyer.is_verified ? 'Yes ✓' : 'No ✗'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Orders</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{statistics.totalOrders}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Member Since</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">
                          {new Date(buyer.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Mail className="h-5 w-5 text-blue-600" />
                      Contact Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">{buyer.email}</span>
                      </div>
                      {buyer.phone_number && (
                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{buyer.phone_number}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-900">
                          {buyer.university?.name || 'N/A'}, {buyer.state || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600 font-medium">Total Orders</p>
                          <p className="text-3xl font-bold text-blue-900 mt-1">{statistics.totalOrders}</p>
                        </div>
                        <ShoppingBag className="h-8 w-8 text-blue-600" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600 font-medium">Total Spent</p>
                          <p className="text-3xl font-bold text-green-900 mt-1">
                            {formatPrice(statistics.totalSpent)}
                          </p>
                        </div>
                        <CreditCard className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-purple-600 font-medium">Avg Order Value</p>
                          <p className="text-3xl font-bold text-purple-900 mt-1">
                            {formatPrice(statistics.averageOrderValue)}
                          </p>
                        </div>
                        <Activity className="h-8 w-8 text-purple-600" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Orders Tab */}
              {/* Orders Tab */}
{activeTab === 'orders' && (
  <div className="space-y-4">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">Order History</h3>
      <span className="text-sm text-gray-600">{orders.length} total orders</span>
    </div>
    {orders.length === 0 ? (
      <div className="text-center py-12 text-gray-500">
        <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p>No orders yet</p>
      </div>
    ) : (
      <div className="space-y-3">
        {orders.map((order: any) => (
          <div key={order.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono font-semibold text-gray-900">{order.order_number}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.order_status)}`}>
                    {order.order_status}
                  </span>
                  {/* Payment Method Badge */}
                  {order.payment_method && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      order.payment_method === 'full' 
                        ? 'bg-green-100 text-green-800' 
                        : order.payment_method === 'half'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {order.payment_method === 'full' 
                        ? '💳 Full Payment' 
                        : order.payment_method === 'half'
                        ? '💰 Half Payment'
                        : '📦 Pay on Delivery'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Product: </span>
                    <span className="font-medium text-gray-900">{order.product?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount: </span>
                    <span className="font-medium text-gray-900">{formatPrice(order.total_amount)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Quantity: </span>
                    <span className="font-medium text-gray-900">{order.quantity}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Date: </span>
                    <span className="font-medium text-gray-900">
                      {new Date(order.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Payment Status: </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(order.payment_status)}`}>
                      {order.payment_status}
                    </span>
                  </div>
                  {order.selected_color && (
                    <div>
                      <span className="text-gray-600">Color: </span>
                      <span className="font-medium text-gray-900">{order.selected_color}</span>
                    </div>
                  )}
                  {order.selected_size && (
                    <div>
                      <span className="text-gray-600">Size: </span>
                      <span className="font-medium text-gray-900">{order.selected_size}</span>
                    </div>
                  )}
                  {order.seller && (
                    <div>
                      <span className="text-gray-600">Seller: </span>
                      <span className="font-medium text-gray-900">{order.seller.full_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
)}

              {/* Transactions Tab */}
              {activeTab === 'transactions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
                    <span className="text-sm text-gray-600">{transactions.length} transactions</span>
                  </div>
                  {transactions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>No transactions yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {transactions.map((txn: any) => (
                        <div key={txn.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(txn.status)}`}>
                              {txn.status}
                            </span>
                            <span className="text-lg font-bold text-gray-900">{formatPrice(txn.amount)}</span>
                          </div>
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="text-gray-600">Reference: </span>
                              <span className="font-mono text-gray-900">{txn.payment_reference}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Provider: </span>
                              <span className="text-gray-900 capitalize">{txn.payment_provider}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Date: </span>
                              <span className="text-gray-900">{formatDate(txn.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Addresses Tab */}
              {activeTab === 'addresses' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Delivery Addresses</h3>
                    <span className="text-sm text-gray-600">{addresses.length} addresses</span>
                  </div>
                  {addresses.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                      <p>No delivery addresses yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {addresses.map((addr: any) => (
                        <div key={addr.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-gray-900">{addr.city}, {addr.state}</h4>
                              {addr.is_default && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <MapPin className="h-5 w-5 text-gray-400" />
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>{addr.address_line}</p>
                            {addr.phone_number && <p>Phone: {addr.phone_number}</p>}
                            <p className="text-xs text-gray-500">
                              Added: {new Date(addr.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === 'activity' && (
                <div className="text-center py-12 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>Activity log coming soon</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {buyer.account_status === 'banned' && buyer.ban_reason && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Ban reason: {buyer.ban_reason}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}