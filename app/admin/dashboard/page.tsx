import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { EnhancedDashboardStats } from '@/components/admin/dashboard/EnhancedDashboardStats';
import { EnhancedRecentActivity } from '@/components/admin/dashboard/EnhancedRecentActivity';
import { DashboardCharts } from '@/components/admin/dashboard/DashboardCharts';
import { requirePermission } from '@/lib/rbac/check-permission';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  // ✅ RBAC: Check view_dashboard permission
  await requirePermission('view_dashboard');

  const params = await searchParams;
  const supabase = createAdminSupabaseClient();

  const { data: orders } = await supabase
    .from('orders')
    .select('total_amount, commission_amount, order_status, payment_status, created_at, escrow_amount')
    .eq('order_status', 'delivered');

  const totalRevenue = (orders || []).reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0);
  const totalCommission = (orders || []).reduce((sum, o) => sum + parseFloat(o.commission_amount || '0'), 0);
  const totalEscrow = (orders || []).reduce((sum, o) => sum + parseFloat(o.escrow_amount || '0'), 0);

  const { data: completedWithdrawals } = await supabase
    .from('withdrawal_requests')
    .select('amount')
    .eq('status', 'completed');

  const totalSellerPayouts = (completedWithdrawals || []).reduce((sum, w) => sum + parseFloat(w.amount || '0'), 0);

  const { count: totalOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  const { count: pendingOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('order_status', 'pending');

  const { count: totalBuyers } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_seller', false);

  const { count: totalSellers } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true });

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

  const { count: pendingProducts } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('approval_status', 'pending');

  const { count: pendingWithdrawals } = await supabase
    .from('withdrawal_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { data: walletData } = await supabase
    .from('sellers')
    .select('wallet_balance');

  const totalWalletBalance = (walletData || []).reduce((sum, s) => sum + parseFloat(s.wallet_balance || '0'), 0);

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
    <div className="space-y-6">
      {params.error === 'unauthorized' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access that page. Contact a super admin if you need access.
          </AlertDescription>
        </Alert>
      )}
      
      <EnhancedDashboardStats stats={stats} />
      <DashboardCharts />
      <EnhancedRecentActivity 
        recentOrders={recentOrders || []} 
        recentUsers={recentUsers || []} 
      />
    </div>
  );
}