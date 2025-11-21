import { redirect } from 'next/navigation';
import { getAdminSession } from '../login/actions';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { DashboardStats } from '@/components/admin/dashboard/DashboardStats';
import { RecentActivity } from '@/components/admin/dashboard/RecentActivity';
import { QuickActions } from '@/components/admin/dashboard/QuickActions';

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  // Use admin client with service role key - bypasses RLS
  const supabase = createAdminSupabaseClient();

  // Get all orders with delivered status
  const { data: orders } = await supabase
    .from('orders')
    .select('total_amount, commission_amount, order_status, payment_status, created_at, escrow_amount')
    .eq('order_status', 'delivered');

  // Calculate metrics from delivered orders only
  const totalRevenue = (orders || []).reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0);
  const totalCommission = (orders || []).reduce((sum, o) => sum + parseFloat(o.commission_amount || '0'), 0);
  const totalEscrow = (orders || []).reduce((sum, o) => sum + parseFloat(o.escrow_amount || '0'), 0);

  // Get actual payouts from withdrawal_requests (CORRECT SOURCE)
  const { data: completedWithdrawals } = await supabase
    .from('withdrawal_requests')
    .select('amount')
    .eq('status', 'completed');

  const totalSellerPayouts = (completedWithdrawals || []).reduce((sum, w) => sum + parseFloat(w.amount || '0'), 0);

  // Get all orders count (including pending, processing, etc.)
  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  const { count: pendingOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('order_status', 'pending');

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

  // Get total wallet balances across all sellers
  const { data: walletData } = await supabase
    .from('sellers')
    .select('wallet_balance');

  const totalWalletBalance = (walletData || []).reduce((sum, s) => sum + parseFloat(s.wallet_balance || '0'), 0);

  // Get recent orders from ALL sellers
  const { data: recentOrders } = await supabase
    .from('orders')
    .select(`
      *,
      buyer:profiles!orders_buyer_id_fkey(full_name, email),
      seller:sellers(business_name),
      product:products(name)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get recent users (both buyers and sellers)
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('full_name, email, created_at, is_seller')
    .order('created_at', { ascending: false })
    .limit(10);

  const stats = {
    totalRevenue,
    totalCommission,
    gmv: totalRevenue,
    escrow: totalEscrow,
    totalSellerPayouts,
    totalWalletBalance,
    totalOrders: totalOrders || 0,
    pendingOrders: pendingOrders || 0,
    deliveredOrders: orders?.length || 0,
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