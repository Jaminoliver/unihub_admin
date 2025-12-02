'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createClient } from '@/lib/supabase/client';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function DashboardCharts() {
  const [salesData, setSalesData] = useState<any[]>([]);
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [revenueByState, setRevenueByState] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    try {
      const supabase = createClient();

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: orders } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at');

      if (orders) {
        const salesByDay = orders.reduce((acc: any, order: any) => {
          const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (!acc[date]) {
            acc[date] = { date, sales: 0 };
          }
          acc[date].sales += parseFloat(order.total_amount || '0');
          return acc;
        }, {});
        setSalesData(Object.values(salesByDay));
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('created_at, is_seller')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (profiles) {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const growthData = last7Days.map(date => {
          const buyers = profiles.filter(p => 
            !p.is_seller && 
            new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === date
          ).length;
          
          return { date, buyers };
        });
        setUserGrowth(growthData);
      }

      const { data: sellers } = await supabase
        .from('sellers')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (sellers) {
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        const sellersData = last7Days.map(date => {
          const count = sellers.filter(s => 
            new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === date
          ).length;
          
          return { date, sellers: count };
        });

        setUserGrowth(prev => prev.map((item, i) => ({ ...item, sellers: sellersData[i].sellers })));
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading chart data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="h-[300px] flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading...</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Sales Trend (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Growth (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="buyers" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="sellers" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}