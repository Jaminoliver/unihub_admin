import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { ApprovalQueue } from '@/components/admin/products/ApprovalQueue';

export default async function PendingProductsPage() {
  const supabase = createAdminSupabaseClient();

  const { data: approvalQueue, error } = await supabase
    .from('product_approvals')
    .select(`
      *,
      products(
        *,
        sellers(
          id,
          business_name,
          full_name,
          email,
          state,
          university_id,
          universities(id, name, state)
        )
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const { count } = await supabase
    .from('product_approvals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Product Approval Queue</h1>
          <p className="text-gray-600 mt-1">{count || 0} products awaiting approval</p>
        </div>
        <ApprovalQueue 
          data={{ 
            products: approvalQueue || [], 
            count: count || 0,
            error: error?.message || null 
          }} 
        />
      </div>
    </div>
  );
}