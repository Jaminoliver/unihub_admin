import { Suspense } from 'react';
import { BarChart3 } from 'lucide-react';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { PlatformAnalytics } from '@/components/admin/financials/PlatformAnalytics';

export default async function AnalyticsPage() {
  const supabase = createAdminSupabaseClient();

  const [
    { data: orders },
    { data: products },
    { data: buyers },
    { data: sellers }
  ] = await Promise.all([
    supabase.from('orders').select('*'),
    supabase.from('products').select('*'),
    supabase.from('profiles').select('*').eq('is_seller', false),
    supabase.from('sellers').select('*')
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Platform Analytics</h1>
              <p className="text-gray-600 mt-1">Comprehensive platform performance insights</p>
            </div>
          </div>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <PlatformAnalytics
            orders={orders || []}
            products={products || []}
            buyers={buyers || []}
            sellers={sellers || []}
          />
        </Suspense>
      </div>
    </div>
  );
}