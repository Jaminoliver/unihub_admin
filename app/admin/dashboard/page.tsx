import { redirect } from 'next/navigation';
import { getAdminSession } from '../login/actions';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DashboardStats } from '@/components/admin/dashboard/DashboardStats';
import { RecentActivity } from '@/components/admin/dashboard/RecentActivity';
import { QuickActions } from '@/components/admin/dashboard/QuickActions';

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const supabase = await createServerSupabaseClient();

  // Get all orders
  const { data: orders } = await supabase
    .from('orders')
    .select('total_amount, commission_amount, payment_status, created_at, escrow_amount');

  // Calculate metrics
  const completedOrders = orders?.filter(o => o.payment_status === 'completed') || [];
  const totalRevenue = completedOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
  const totalCommission = totalRevenue * 0.05; // 5% commission
  const totalEscrow = completedOrders.reduce((sum, o) => sum + parseFloat(o.escrow_amount || 0), 0);

  // Get user counts
  const { count: totalBuyers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_seller', false);

  const { count: totalSellers } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true });

  // Get today's signups
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count: todayBuyers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_seller', false)
    .gte('created_at', today.toISOString());

  const { count: todaySellers } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString());

  // Get pending items
  const { count: pendingProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: pendingWithdrawals } = await supabase
    .from('withdrawal_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  // Get recent orders
  const { data: recentOrders } = await supabase
    .from('orders')
    .select(`
      *,
      buyer:profiles!orders_buyer_id_fkey(full_name, email),
      seller:sellers(business_name),
      product:products(name)
    `)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get recent users
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('full_name, email, created_at, is_seller')
    .order('created_at', { ascending: false })
    .limit(5);

  const stats = {
    totalRevenue,
    totalCommission,
    gmv: totalRevenue,
    escrow: totalEscrow,
    totalBuyers: totalBuyers || 0,
    totalSellers: totalSellers || 0,
    todayBuyers: todayBuyers || 0,
    todaySellers: todaySellers || 0,
    pendingProducts: pendingProducts || 0,
    pendingWithdrawals: pendingWithdrawals || 0,
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {session.full_name}</p>
        </div>

        {/* Stats Grid */}
        <DashboardStats stats={stats} />

        {/* Quick Actions */}
        <QuickActions stats={stats} />

        {/* Recent Activity */}
        <RecentActivity 
          recentOrders={recentOrders || []} 
          recentUsers={recentUsers || []} 
        />
      </div>
    </div>
  );
}