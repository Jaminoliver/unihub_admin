'use client';

import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, AlertCircle, Clock } from 'lucide-react';

interface StatsProps {
  stats: {
    totalRevenue: number;
    totalCommission: number;
    gmv: number;
    escrow: number;
    totalSellerPayouts: number;
    totalWalletBalance: number;
    totalOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
    totalBuyers: number;
    totalSellers: number;
    todayBuyers: number;
    todaySellers: number;
    pendingProducts: number;
    pendingWithdrawals: number;
  };
}

export function EnhancedDashboardStats({ stats }: StatsProps) {
  const statCards = [
    {
      title: 'Total Revenue',
      value: `₦${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-50',
      change: '+12.5%',
      changeType: 'positive' as const,
    },
    {
      title: 'Commission Earned',
      value: `₦${stats.totalCommission.toLocaleString()}`,
      icon: TrendingUp,
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50',
      change: '+8.2%',
      changeType: 'positive' as const,
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-50',
      subtext: `${stats.deliveredOrders} delivered`,
    },
    {
      title: 'Active Users',
      value: (stats.totalBuyers + stats.totalSellers).toLocaleString(),
      icon: Users,
      color: 'from-orange-500 to-red-600',
      bgColor: 'bg-orange-50',
      subtext: `+${stats.todayBuyers + stats.todaySellers} today`,
    },
  ];

  const actionCards = [
    {
      title: 'Pending Products',
      value: stats.pendingProducts,
      icon: Package,
      color: 'from-yellow-500 to-orange-500',
      link: '/admin/products?tab=approval',
      urgent: stats.pendingProducts > 5,
    },
    {
      title: 'Pending Withdrawals',
      value: stats.pendingWithdrawals,
      icon: Clock,
      color: 'from-red-500 to-pink-600',
      link: '/admin/withdrawals',
      urgent: stats.pendingWithdrawals > 3,
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders,
      icon: AlertCircle,
      color: 'from-indigo-500 to-purple-600',
      link: '/admin/orders',
      urgent: stats.pendingOrders > 10,
    },
    {
      title: 'Escrow Amount',
      value: `₦${stats.escrow.toLocaleString()}`,
      icon: DollarSign,
      color: 'from-teal-500 to-cyan-600',
      link: '/admin/transactions',
      urgent: false,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.color} opacity-5 rounded-full -mr-12 -mt-12`} />
              <div className="relative p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  {stat.change && (
                    <span className={`flex items-center gap-1 text-sm font-semibold ${
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stat.changeType === 'positive' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {stat.change}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  {stat.subtext && (
                    <p className="text-sm text-gray-500 mt-1">{stat.subtext}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Required Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Action Required</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {actionCards.map((card) => {
            const Icon = card.icon;
            return (
              <a
                key={card.title}
                href={card.link}
                className={`block bg-white rounded-lg border-2 p-5 hover:shadow-md transition-all duration-200 ${
                  card.urgent ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color}`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  {card.urgent && (
                    <span className="px-2 py-1 text-xs font-semibold text-red-600 bg-red-100 rounded-full">
                      Urgent
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </a>
            );
          })}
        </div>
      </div>

      {/* Financial Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Gross Merchandise Value</p>
            <p className="text-2xl font-bold text-gray-900">₦{stats.gmv.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Seller Payouts</p>
            <p className="text-2xl font-bold text-gray-900">₦{stats.totalSellerPayouts.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Seller Wallet Balance</p>
            <p className="text-2xl font-bold text-gray-900">₦{stats.totalWalletBalance.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}