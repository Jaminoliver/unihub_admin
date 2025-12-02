import { Suspense } from 'react';
import { Wallet } from 'lucide-react';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { EscrowDashboard } from '@/components/admin/transactions/EscrowDashboard';

export default async function EscrowDashboardPage() {
  const supabase = createAdminSupabaseClient();

  // First, let's see ALL escrow records
  const { data: allEscrow, error: allError } = await supabase
    .from('escrow')
    .select('*');

  console.log('=== ALL ESCROW RECORDS ===');
  console.log('Total records:', allEscrow?.length);
  console.log('Records:', JSON.stringify(allEscrow, null, 2));
  console.log('Error:', allError);

  // Query the escrow table with joins - show ALL records
  const { data: escrowRecords, error } = await supabase
    .from('escrow')
    .select(`
      *,
      order:orders(
        id,
        order_number,
        total_amount,
        payment_method,
        order_status,
        created_at,
        product:products(id, name, image_urls)
      ),
      buyer:profiles!buyer_id(
        id,
        full_name,
        email,
        university_id
      ),
      seller:profiles!seller_id(
        id,
        full_name,
        email,
        university_id
      )
    `)
    .order('created_at', { ascending: false });

  console.log('=== FILTERED ESCROW RECORDS ===');
  console.log('Records with joins:', escrowRecords?.length);
  console.log('Error:', error);
  console.log('Sample record:', JSON.stringify(escrowRecords?.[0], null, 2));

  if (error) {
    console.error('Escrow query error:', error);
  }

  // Get unique university IDs
  const universityIds = new Set<string>();
  escrowRecords?.forEach(record => {
    if (record.buyer?.university_id) universityIds.add(record.buyer.university_id);
    if (record.seller?.university_id) universityIds.add(record.seller.university_id);
  });

  // Fetch universities separately
  const { data: universities } = await supabase
    .from('universities')
    .select('id, name')
    .in('id', Array.from(universityIds));

  const universityMap = new Map(universities?.map(u => [u.id, u.name]) || []);

  // Attach university names to records
  const enrichedRecords = escrowRecords?.map(record => ({
    ...record,
    buyer: record.buyer ? {
      ...record.buyer,
      university: { name: universityMap.get(record.buyer.university_id) || 'N/A' }
    } : null,
    seller: record.seller ? {
      ...record.seller,
      university: { name: universityMap.get(record.seller.university_id) || 'N/A' }
    } : null,
  }));

  const totalEscrow = (enrichedRecords || []).reduce(
    (sum, e) => sum + parseFloat(e.amount || '0'), 
    0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <Wallet className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Escrow Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Total in Escrow: ₦{totalEscrow.toLocaleString()} • {enrichedRecords?.length || 0} active holds
              </p>
              {/* DEBUG INFO */}
              <p className="text-xs text-gray-500 mt-2">
                Debug: Total in DB: {allEscrow?.length} | Filtered: {escrowRecords?.length} | Enriched: {enrichedRecords?.length}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">Error loading escrow records: {error.message}</p>
          </div>
        )}

        <Suspense fallback={<div>Loading...</div>}>
          <EscrowDashboard escrowRecords={enrichedRecords || []} />
        </Suspense>
      </div>
    </div>
  );
}