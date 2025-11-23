import { redirect } from 'next/navigation';
import { getAdminSession } from '@/app/admin/(auth)/login/actions';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { WithdrawalTabs } from '@/components/admin/WithdrawalTabs';

export default async function WithdrawalsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const supabase = createAdminSupabaseClient();

  // Get pending withdrawals
  const { data: pendingWithdrawals } = await supabase
    .from('withdrawal_requests')
    .select(`
      *,
      seller:sellers (
        business_name,
        user_id,
        wallet_balance,
        profiles:user_id (
          full_name,
          email
        )
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Get completed withdrawals (payout history)
  const { data: completedWithdrawals } = await supabase
    .from('withdrawal_requests')
    .select(`
      *,
      seller:sellers (
        business_name,
        user_id,
        wallet_balance,
        profiles:user_id (
          full_name,
          email
        )
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
        user_id,
        wallet_balance,
        profiles:user_id (
          full_name,
          email
        )
      )
    `)
    .eq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(50);

  // Get stats
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

  // Calculate total completed amount
  const totalCompletedAmount = (completedWithdrawals || []).reduce(
    (sum, w) => sum + parseFloat(w.amount || '0'), 
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Withdrawal Management</h1>
        <p className="text-gray-500 mt-1">Process seller withdrawal requests and view payout history</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
          <p className="text-gray-500 text-sm">Pending Withdrawals</p>
          <p className="text-3xl font-bold text-yellow-600">{pendingCount || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-gray-500 text-sm">Completed</p>
          <p className="text-3xl font-bold text-green-600">{completedCount || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
          <p className="text-gray-500 text-sm">Failed</p>
          <p className="text-3xl font-bold text-red-600">{failedCount || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-gray-500 text-sm">Total Paid Out</p>
          <p className="text-2xl font-bold text-blue-600">
            ₦{totalCompletedAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Withdrawal Tabs */}
      <WithdrawalTabs 
        pendingWithdrawals={pendingWithdrawals || []}
        completedWithdrawals={completedWithdrawals || []}
        failedWithdrawals={failedWithdrawals || []}
      />
    </div>
  );
}