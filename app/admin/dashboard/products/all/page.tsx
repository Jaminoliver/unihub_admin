import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { AllProducts } from '@/components/admin/products/AllProducts';

export default async function AllProductsPage() {
  const supabase = createAdminSupabaseClient();

  const { data: products, error } = await supabase
    .from('products')
    .select(`
      *,
      sellers(
        id,
        business_name,
        full_name,
        email,
        phone_number,
        state,
        university:universities(name)
      )
    `)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">All Products</h1>
          <p className="text-gray-600 mt-1">Manage all products in the marketplace</p>
        </div>
        <AllProducts 
          data={{ 
            products: products || [], 
            error: error?.message || null 
          }} 
        />
      </div>
    </div>
  );
}