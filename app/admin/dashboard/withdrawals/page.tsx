import { redirect } from 'next/navigation';
import { getAdminSession } from '@/app/admin/(auth)/login/actions';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { WithdrawalTabs } from '@/components/admin/WithdrawalTabs';
import { SellerWalletsTable } from '@/components/admin/SellerWalletsTable';

export default async function WithdrawalsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const supabase = createAdminSupabaseClient();

  console.log('🔑 Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('🔑 Service Role Key prefix:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 30));
  console.log('🌐 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

  // Get pending withdrawals with FULL seller details
  // Get pending AND on_hold withdrawals
const { data: pendingWithdrawals } = await supabase
  .from('withdrawal_requests')
  .select(`
    *,
    seller:sellers (
      id,
      business_name,
      full_name,
      email,
      phone_number,
      state,
      user_id,
      wallet_balance,
      bank_account_number,
      bank_name,
      account_name,
      bank_verified,
      is_verified,
      is_active,
      rating,
      total_sales,
      created_at,
      university:universities(name)
    )
  `)
  .in('status', ['pending', 'on_hold'])
  .order('created_at', { ascending: false });

  // Fetch additional data for each pending withdrawal
  const enrichedPending = await Promise.all(
    (pendingWithdrawals || []).map(async (withdrawal) => {
      const sellerId = withdrawal.seller.id;

      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId);

      const { count: deliveredOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .eq('order_status', 'delivered');

      const { count: pendingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .in('order_status', ['pending', 'confirmed', 'shipped']);

      const { count: disputes } = await supabase
        .from('disputes')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', sellerId);

      const { data: recentTransactions } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(5);

      const { data: previousWithdrawals } = await supabase
        .from('withdrawal_requests')
        .select('amount, status, created_at, processed_at')
        .eq('seller_id', sellerId)
        .neq('id', withdrawal.id)
        .order('created_at', { ascending: false })
        .limit(5);

      return {
        ...withdrawal,
        sellerStats: {
          totalOrders: totalOrders || 0,
          deliveredOrders: deliveredOrders || 0,
          pendingOrders: pendingOrders || 0,
          disputes: disputes || 0,
          completionRate: totalOrders ? ((deliveredOrders || 0) / totalOrders * 100).toFixed(1) : '0',
          accountAge: Math.floor((Date.now() - new Date(withdrawal.seller.created_at).getTime()) / (1000 * 60 * 60 * 24))
        },
        recentTransactions: recentTransactions || [],
        previousWithdrawals: previousWithdrawals || []
      };
    })
  );

  // Get completed withdrawals
  const { data: completedWithdrawals } = await supabase
    .from('withdrawal_requests')
    .select(`
      *,
      seller:sellers (
        business_name,
        full_name,
        email,
        user_id,
        wallet_balance
      )
    `)
    .eq('status', 'completed')
    .order('processed_at', { ascending: false })
    .limit(50);

  // Get failed withdrawals
  const { data: failedWithdrawals } = await supabase
    .from('withdrawal_requests')
    .select(`
      *,
      seller:sellers (
        business_name,
        full_name,
        email,
        user_id,
        wallet_balance
      )
    `)
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(50);

  // Get rejected withdrawals
  const { data: rejectedWithdrawals } = await supabase
    .from('withdrawal_requests')
    .select(`
      *,
      seller:sellers (
        business_name,
        full_name,
        email,
        user_id,
        wallet_balance
      )
    `)
    .eq('status', 'rejected')
    .order('rejected_at', { ascending: false })
    .limit(50);

  // Get ALL sellers with wallet information
  const { data: allSellers, error: sellersError } = await supabase
    .from('sellers')
    .select(`
      id,
      user_id,
      business_name,
      full_name,
      email,
      phone_number,
      state,
      wallet_balance,
      bank_name,
      bank_account_number,
      account_name,
      bank_verified,
      is_verified,
      is_active,
      created_at,
      university:universities(name)
    `)
    .order('wallet_balance', { ascending: false });

  console.log('👥 Sellers error:', sellersError);
  console.log('👥 Sellers count:', allSellers?.length);
  console.log('👥 First seller:', allSellers?.[0]);

  // Enrich each seller with wallet statistics
  const enrichedSellers = await Promise.all(
    (allSellers || []).map(async (seller) => {
      const { data: completedWithdrawalsData } = await supabase
        .from('withdrawal_requests')
        .select('amount')
        .eq('seller_id', seller.id)
        .eq('status', 'completed');

      const totalWithdrawn = (completedWithdrawalsData || []).reduce(
        (sum, w) => sum + parseFloat(w.amount || '0'),
        0
      );

      const { count: pendingCount } = await supabase
        .from('withdrawal_requests')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', seller.id)
        .eq('status', 'pending');

      const { data: lastWithdrawal } = await supabase
        .from('withdrawal_requests')
        .select('processed_at')
        .eq('seller_id', seller.id)
        .eq('status', 'completed')
        .order('processed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: transactionCount } = await supabase
        .from('wallet_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', seller.id);

      const { data: deliveredOrders } = await supabase
        .from('orders')
        .select('seller_payout_amount')
        .eq('seller_id', seller.id)
        .eq('order_status', 'delivered');

      const totalEarned = (deliveredOrders || []).reduce(
        (sum, o) => sum + parseFloat(o.seller_payout_amount || '0'),
        0
      );

      return {
        ...seller,
        walletStats: {
          totalEarned,
          totalWithdrawn,
          pendingWithdrawals: pendingCount || 0,
          lastWithdrawalDate: lastWithdrawal?.processed_at || null,
          transactionCount: transactionCount || 0
        }
      };
    })
  );

  const { count: pendingCount } = await supabase
    .from('withdrawal_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: completedCount } = await supabase
    .from('withdrawal_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  const { count: failedCount } = await supabase
    .from('withdrawal_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed');

  const { count: rejectedCount } = await supabase
    .from('withdrawal_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'rejected');

  const totalCompletedAmount = (completedWithdrawals || []).reduce(
    (sum, w) => sum + parseFloat(w.amount || '0'), 
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Withdrawal Management</h1>
          <p className="text-gray-600 mt-1">Process seller withdrawal requests and manage payouts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500">
            <p className="text-gray-500 text-sm font-medium">Pending Withdrawals</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingCount || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
            <p className="text-gray-500 text-sm font-medium">Completed</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{completedCount || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
            <p className="text-gray-500 text-sm font-medium">Failed</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{failedCount || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-gray-500">
            <p className="text-gray-500 text-sm font-medium">Rejected</p>
            <p className="text-3xl font-bold text-gray-600 mt-2">{rejectedCount || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
            <p className="text-gray-500 text-sm font-medium">Total Paid Out</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              ₦{totalCompletedAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <SellerWalletsTable sellers={enrichedSellers || []} />
        </div>

        <WithdrawalTabs 
          pendingWithdrawals={enrichedPending || []}
          completedWithdrawals={completedWithdrawals || []}
          failedWithdrawals={failedWithdrawals || []}
          rejectedWithdrawals={rejectedWithdrawals || []}
        />
      </div>
    </div>
  );
}