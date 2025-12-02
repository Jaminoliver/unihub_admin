import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { AppealsManager } from '@/components/admin/products/AppealManager';

export default async function AppealsPage() {
  const supabase = createAdminSupabaseClient();

  const { data: appeals, error } = await supabase
    .from('appeals')
    .select(`
      *,
      products(
        id,
        name,
        price,
        image_urls,
        admin_suspension_reason,
        admin_suspended
      ),
      sellers(
        id,
        business_name,
        full_name
      )
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Product Appeals</h1>
          <p className="text-gray-600 mt-1">
            Review and manage appeals from sellers for suspended products
          </p>
        </div>
        <AppealsManager appeals={appeals || []} />
      </div>
    </div>
  );
}