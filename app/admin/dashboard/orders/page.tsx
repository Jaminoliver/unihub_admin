import { redirect } from 'next/navigation';
import { getAdminSession } from '@/app/admin/(auth)/login/actions';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { OrdersTable } from '@/components/admin/orders/OrdersTable';

export default async function OrdersPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const supabase = createAdminSupabaseClient();

  console.log('📦 Fetching orders...');

  // Get ALL orders first
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  console.log('✅ Orders fetched:', orders?.length);
  console.log('❌ Orders error:', ordersError);

  if (ordersError || !orders || orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900">Orders Management</h1>
            <p className="text-gray-600 mt-1">View and manage all orders</p>
          </div>
          <div className="bg-white p-12 rounded-xl text-center">
            <p className="text-gray-500">
              {ordersError ? `Error: ${ordersError.message}` : 'No orders found'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get unique IDs
  const buyerIds = [...new Set(orders.map(o => o.buyer_id).filter(Boolean))];
  const sellerIds = [...new Set(orders.map(o => o.seller_id).filter(Boolean))];
  const productIds = [...new Set(orders.map(o => o.product_id).filter(Boolean))];

  console.log('📊 Fetching related data...');
  console.log('Buyers:', buyerIds.length);
  console.log('Sellers:', sellerIds.length);
  console.log('Products:', productIds.length);

  // Fetch all related data in parallel
  const [buyersRes, sellersRes, productsRes] = await Promise.all([
    buyerIds.length > 0
      ? supabase.from('profiles').select('id, full_name, email, state, university_id').in('id', buyerIds)
      : { data: [], error: null },
    sellerIds.length > 0
      ? supabase.from('sellers').select('id, business_name, full_name, email, state, university_id').in('id', sellerIds)
      : { data: [], error: null },
    productIds.length > 0
      ? supabase.from('products').select('id, name, image_urls').in('id', productIds)
      : { data: [], error: null },
  ]);

  console.log('✅ Buyers:', buyersRes.data?.length, buyersRes.error);
  console.log('✅ Sellers:', sellersRes.data?.length, sellersRes.error);
  console.log('✅ Products:', productsRes.data?.length, productsRes.error);

  const buyers = buyersRes.data || [];
  const sellers = sellersRes.data || [];
  const products = productsRes.data || [];

  // Get universities
  const universityIds = [
    ...buyers.map((b: any) => b.university_id).filter(Boolean),
    ...sellers.map((s: any) => s.university_id).filter(Boolean),
  ];
  const uniqueUniversityIds = [...new Set(universityIds)];

  let universities: Array<{ id: string; name: string }> = [];
  if (uniqueUniversityIds.length > 0) {
    const { data: uniData } = await supabase
      .from('universities')
      .select('id, name')
      .in('id', uniqueUniversityIds);
    universities = uniData || [];
  }

  console.log('✅ Universities:', universities.length);

  // Create lookup maps
  const buyerMap = new Map(buyers.map((b: any) => [b.id, b]));
  const sellerMap = new Map(sellers.map((s: any) => [s.id, s]));
  const productMap = new Map(products.map((p: any) => [p.id, p]));
  const universityMap = new Map(universities.map(u => [u.id, u]));

  // Enrich orders
  const enrichedOrders = orders.map(order => {
    const buyer = buyerMap.get(order.buyer_id);
    const seller = sellerMap.get(order.seller_id);
    const product = productMap.get(order.product_id);

    return {
      ...order,
      buyer: buyer ? {
        ...buyer,
        university: buyer.university_id ? universityMap.get(buyer.university_id) : null,
      } : null,
      seller: seller ? {
        ...seller,
        university: seller.university_id ? universityMap.get(seller.university_id) : null,
      } : null,
      product: product || null,
    };
  });

  console.log('✅ Orders enriched:', enrichedOrders.length);

  // Get stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.order_status === 'pending').length,
    confirmed: orders.filter(o => o.order_status === 'confirmed').length,
    shipped: orders.filter(o => o.order_status === 'shipped').length,
    delivered: orders.filter(o => o.order_status === 'delivered').length,
    cancelled: orders.filter(o => o.order_status === 'cancelled').length,
    refunded: orders.filter(o => o.order_status === 'refunded').length,
  };

  const totalRevenue = orders
    .filter(o => o.payment_status === 'completed')
    .reduce((sum, o) => sum + parseFloat(o.total_amount || '0'), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-gray-600 mt-1">View and manage all orders</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
            <p className="text-gray-500 text-xs font-medium">Total Orders</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500">
            <p className="text-gray-500 text-xs font-medium">Pending</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500">
            <p className="text-gray-500 text-xs font-medium">Confirmed</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{stats.confirmed}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-indigo-500">
            <p className="text-gray-500 text-xs font-medium">Shipped</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.shipped}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
            <p className="text-gray-500 text-xs font-medium">Delivered</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.delivered}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
            <p className="text-gray-500 text-xs font-medium">Cancelled</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.cancelled}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-cyan-500">
            <p className="text-gray-500 text-xs font-medium">Total Revenue</p>
            <p className="text-lg font-bold text-cyan-600 mt-1">
              ₦{totalRevenue.toLocaleString('en-NG', { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Orders Table */}
        <OrdersTable 
          orders={enrichedOrders} 
          sellers={sellers}
        />
      </div>
    </div>
  );
}