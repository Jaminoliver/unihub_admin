'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Package, ShoppingCart } from 'lucide-react';

interface PlatformAnalyticsProps {
  orders: any[];
  products: any[];
  buyers: any[];
  sellers: any[];
}

export function PlatformAnalytics({ orders, products, buyers, sellers }: PlatformAnalyticsProps) {
  const completedOrders = orders.filter(o => o.order_status === 'delivered' || o.order_status === 'completed');
  const paidOrders = orders.filter(o => o.payment_status === 'completed');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0);
  const gmv = orders.reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0);
  const avgOrderValue = orders.length > 0 ? gmv / orders.length : 0;
  const completionRate = orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0;

  const topProducts = products
    .sort((a, b) => (b.sold_count || 0) - (a.sold_count || 0))
    .slice(0, 10);

  const sellerRevenue = paidOrders.reduce((acc: any, order) => {
    const sellerId = order.seller_id;
    if (!acc[sellerId]) {
      acc[sellerId] = {
        id: sellerId,
        orderCount: 0,
        revenue: 0
      };
    }
    acc[sellerId].orderCount++;
    acc[sellerId].revenue += parseFloat(order.total_amount || '0');
    return acc;
  }, {});

  const topSellers = Object.values(sellerRevenue)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 10)
    .map((seller: any) => {
      const sellerData = sellers.find(s => s.id === seller.id);
      return {
        ...seller,
        business_name: sellerData?.business_name || 'Unknown'
      };
    });

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);

  const stats = [
    { label: 'Total Revenue (Paid)', value: formatPrice(totalRevenue), icon: TrendingUp, color: 'text-green-600' },
    { label: 'GMV (All Orders)', value: formatPrice(gmv), icon: TrendingUp, color: 'text-blue-600' },
    { label: 'Total Orders', value: orders.length.toLocaleString(), icon: ShoppingCart, color: 'text-blue-600' },
    { label: 'Total Products', value: products.length.toLocaleString(), icon: Package, color: 'text-purple-600' },
    { label: 'Total Users', value: (buyers.length + sellers.length).toLocaleString(), icon: Users, color: 'text-orange-600' },
    { label: 'Avg Order Value', value: formatPrice(avgOrderValue), icon: TrendingUp, color: 'text-green-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Products by Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-gray-500">{product.sold_count || 0} sold</p>
                    </div>
                  </div>
                  <p className="font-bold">{formatPrice(parseFloat(product.price || '0'))}</p>
                </div>
              ))}
              {topProducts.length === 0 && (
                <p className="text-center text-gray-500">No products with sales yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Sellers by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSellers.map((seller: any, index) => (
                <div key={seller.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400">#{index + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{seller.business_name}</p>
                      <p className="text-xs text-gray-500">{seller.orderCount} orders</p>
                    </div>
                  </div>
                  <p className="font-bold">{formatPrice(seller.revenue)}</p>
                </div>
              ))}
              {topSellers.length === 0 && (
                <p className="text-center text-gray-500">No seller data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}