'use client';

import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, TrendingUp, Wallet, Users, UserPlus, Package, AlertCircle } from 'lucide-react';

interface DashboardStatsProps {
  stats: {
    totalRevenue: number;
    totalCommission: number;
    gmv: number;
    escrow: number;
    totalBuyers: number;
    totalSellers: number;
    todayBuyers: number;
    todaySellers: number;
    pendingProducts: number;
    pendingWithdrawals: number;
  };
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const mainStats = [
    {
      title: 'Platform Commission (5%)',
      value: `₦${stats.totalCommission.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'bg-green-100 text-green-600',
    },
    {
      title: 'GMV (Gross Merchandise Value)',
      value: `₦${stats.gmv.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Funds in Escrow',
      value: `₦${stats.escrow.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      icon: Wallet,
      color: 'bg-purple-100 text-purple-600',
    },
  ];

  const userStats = [
    {
      title: 'Total Buyers',
      value: stats.totalBuyers.toLocaleString(),
      subtitle: `+${stats.todayBuyers} today`,
      icon: Users,
      color: 'bg-indigo-100 text-indigo-600',
    },
    {
      title: 'Total Sellers',
      value: stats.totalSellers.toLocaleString(),
      subtitle: `+${stats.todaySellers} today`,
      icon: UserPlus,
      color: 'bg-cyan-100 text-cyan-600',
    },
  ];

  const pendingStats = [
    {
      title: 'Products Awaiting Approval',
      value: stats.pendingProducts.toLocaleString(),
      icon: Package,
      color: 'bg-yellow-100 text-yellow-600',
    },
    {
      title: 'Pending Withdrawals',
      value: stats.pendingWithdrawals.toLocaleString(),
      icon: AlertCircle,
      color: 'bg-orange-100 text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Key Performance Indicators</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mainStats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`rounded-full p-3 ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* User Stats */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">User Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userStats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <p className="text-xs text-green-600 mt-1">{stat.subtitle}</p>
                  </div>
                  <div className={`rounded-full p-3 ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Pending Items */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Pending Items</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingStats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  </div>
                  <div className={`rounded-full p-3 ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}