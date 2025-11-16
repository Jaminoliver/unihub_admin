import { redirect } from 'next/navigation';
import { getAdminSession } from '../login/actions';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { WithdrawalProcessor } from '@/components/admin/WithdrawalProcessor';

export default async function WithdrawalsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const supabase = await createServerSupabaseClient();

  // Get pending withdrawals
  const { data: withdrawals } = await supabase
    .from('withdrawal_requests')
    .select(`
      *,
      seller:sellers (
        full_name,
        email,
        wallet_balance
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Get stats
  const { count: pendingCount } = await supabase
    .from('withdrawal_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const { count: completedCount } = await supabase
    .from('withdrawal_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Withdrawal Management</h1>
        <p className="text-gray-500 mt-1">Process seller withdrawal requests</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Pending Withdrawals</p>
          <p className="text-3xl font-bold text-yellow-600">{pendingCount || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Completed</p>
          <p className="text-3xl font-bold text-green-600">{completedCount || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-500 text-sm">Total Processed</p>
          <p className="text-3xl font-bold text-blue-600">{completedCount || 0}</p>
        </div>
      </div>

      {/* Withdrawal Processor */}
      <WithdrawalProcessor withdrawals={withdrawals || []} />
    </div>
  );
}