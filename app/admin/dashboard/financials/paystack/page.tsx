import { Suspense } from 'react';
import { CreditCard } from 'lucide-react';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { PaystackLogs } from '@/components/admin/financials/PaystackLogs';

export default async function PaystackLogsPage() {
  const supabase = createAdminSupabaseClient();

  const { data: orders } = await supabase
    .from('orders')
    .select(`
      *,
      buyer:profiles!orders_buyer_id_fkey(full_name, email),
      seller:sellers!orders_seller_id_fkey(business_name)
    `)
    .in('payment_method', ['full', 'half'])
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <CreditCard className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Paystack Transaction Logs</h1>
              <p className="text-gray-600 mt-1">Monitor payment gateway transactions</p>
            </div>
          </div>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <PaystackLogs orders={orders || []} />
        </Suspense>
      </div>
    </div>
  );
}