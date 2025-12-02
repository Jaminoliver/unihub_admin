import { Suspense } from 'react';
import { TrendingUp } from 'lucide-react';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { CommissionReports } from '@/components/admin/financials/CommissionReports';

export default async function CommissionPage() {
  const supabase = createAdminSupabaseClient();

  // Fetch all completed online payments (full/half)
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      buyer:profiles!orders_buyer_id_fkey(
        state, 
        university:universities!profiles_university_id_fkey(name)
      ),
      seller:sellers!orders_seller_id_fkey(
        state, 
        university:universities!sellers_university_id_fkey(name)
      )
    `)
    .eq('payment_status', 'completed')
    .in('payment_method', ['full', 'half'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching orders:', error);
  }

  // Calculate summary stats
  const allOrders = orders || [];
  const earnedOrders = allOrders.filter(o => o.order_status === 'delivered');
  const pendingOrders = allOrders.filter(o => o.order_status === 'pending');
  const refundedOrders = allOrders.filter(o => o.order_status === 'refunded');

  const earnedCommission = earnedOrders.reduce((sum, o) => sum + parseFloat(o.commission_amount || '0'), 0);
  const pendingCommission = pendingOrders.reduce((sum, o) => sum + parseFloat(o.commission_amount || '0'), 0);
  const refundedCommission = refundedOrders.reduce((sum, o) => sum + parseFloat(o.commission_amount || '0'), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Commission Reports</h1>
              <p className="text-gray-600 mt-1">
                Track and analyze commission earnings from online payments
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            Error loading orders: {error.message}
          </div>
        )}

        <Suspense fallback={<div>Loading...</div>}>
          <CommissionReports 
            orders={allOrders}
            earnedCommission={earnedCommission}
            pendingCommission={pendingCommission}
            refundedCommission={refundedCommission}
            earnedCount={earnedOrders.length}
            pendingCount={pendingOrders.length}
            refundedCount={refundedOrders.length}
          />
        </Suspense>
      </div>
    </div>
  );
}