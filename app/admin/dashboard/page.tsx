import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { WithdrawalProcessor } from '@/components/admin/WithdrawalProcessor';

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

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
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage withdrawal requests</p>
          </div>
          <form action="/api/auth/signout" method="post">
            <button className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
              Sign Out
            </button>
          </form>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-500 text-sm">Pending Withdrawals</p>
            <p className="text-3xl font-bold text-yellow-600">{pendingCount || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-500 text-sm">Completed Today</p>
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
    </div>
  );
}