import { redirect } from 'next/navigation';
import { getAdminSession } from '@/app/admin/(auth)/login/actions';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { TransactionsTable } from '@/components/admin/transactions/TransactionsTable';
import { DollarSign } from 'lucide-react';

export default async function AllTransactionsPage() {
  const session = await getAdminSession();
  if (!session) redirect('/admin/login');

  const supabase = createAdminSupabaseClient();

  console.log('💰 Fetching transactions...');

  // Get ALL transactions
  const { data: transactions, error: transactionsError } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });

  console.log('✅ Transactions fetched:', transactions?.length);
  console.log('❌ Transactions error:', transactionsError);

  if (transactionsError || !transactions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900">All Transactions</h1>
            <p className="text-gray-600 mt-1">Complete transaction history</p>
          </div>
          <div className="bg-white p-12 rounded-xl text-center">
            <p className="text-gray-500">
              {transactionsError ? `Error: ${transactionsError.message}` : 'No transactions found'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get unique user IDs and order IDs
  const userIds = [...new Set(transactions.map(t => t.user_id).filter(Boolean))];
  const orderIds = [...new Set(transactions.map(t => t.order_id).filter(Boolean))];

  console.log('📊 Fetching related data...');
  console.log('Users:', userIds.length);
  console.log('Orders:', orderIds.length);

  // Fetch users (buyers) and orders
  const [usersRes, ordersRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from('profiles').select('id, full_name, email').in('id', userIds)
      : { data: [], error: null },
    orderIds.length > 0
      ? supabase.from('orders').select('id, order_number, seller_id, product_id').in('id', orderIds)
      : { data: [], error: null },
  ]);

  const users = usersRes.data || [];
  const orders = ordersRes.data || [];

  console.log('✅ Users:', users.length);
  console.log('✅ Orders:', orders.length);

  // Get sellers and products from orders
  const sellerIds = [...new Set(orders.map((o: any) => o.seller_id).filter(Boolean))];
  const productIds = [...new Set(orders.map((o: any) => o.product_id).filter(Boolean))];

  const [sellersRes, productsRes] = await Promise.all([
    sellerIds.length > 0
      ? supabase.from('sellers').select('id, business_name, full_name, email').in('id', sellerIds)
      : { data: [], error: null },
    productIds.length > 0
      ? supabase.from('products').select('id, name').in('id', productIds)
      : { data: [], error: null },
  ]);

  const sellers = sellersRes.data || [];
  const products = productsRes.data || [];

  console.log('✅ Sellers:', sellers.length);
  console.log('✅ Products:', products.length);

  // Create lookup maps
  const userMap = new Map(users.map((u: any) => [u.id, u]));
  const orderMap = new Map(orders.map((o: any) => [o.id, o]));
  const sellerMap = new Map(sellers.map((s: any) => [s.id, s]));
  const productMap = new Map(products.map((p: any) => [p.id, p]));

  // Enrich transactions
  const enrichedTransactions = transactions.map(txn => {
    const user = userMap.get(txn.user_id);
    const order = orderMap.get(txn.order_id);
    const seller = order ? sellerMap.get(order.seller_id) : null;
    const product = order ? productMap.get(order.product_id) : null;

    return {
      ...txn,
      user,
      order: order ? {
        ...order,
        seller,
        product,
      } : null,
    };
  });

  console.log('✅ Transactions enriched:', enrichedTransactions.length);

  // Calculate stats
  const stats = {
    total: transactions.length,
    payments: transactions.filter(t => t.transaction_type === 'payment').length,
    refunds: transactions.filter(t => t.transaction_type === 'refund').length,
    success: transactions.filter(t => t.status === 'success').length,
    failed: transactions.filter(t => t.status === 'failed').length,
    pending: transactions.filter(t => t.status === 'pending').length,
  };

  const totalAmount = transactions
    .filter(t => t.status === 'success' && t.transaction_type === 'payment')
    .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

  const totalRefunded = transactions
    .filter(t => t.status === 'success' && t.transaction_type === 'refund')
    .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">All Transactions</h1>
              <p className="text-gray-600 mt-1">Complete transaction history and payment tracking</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
            <p className="text-gray-500 text-xs font-medium">Total Transactions</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
            <p className="text-gray-500 text-xs font-medium">Payments</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.payments}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
            <p className="text-gray-500 text-xs font-medium">Refunds</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.refunds}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-emerald-500">
            <p className="text-gray-500 text-xs font-medium">Successful</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.success}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-cyan-500">
            <p className="text-gray-500 text-xs font-medium">Total Processed</p>
            <p className="text-lg font-bold text-cyan-600 mt-1">
              ₦{totalAmount.toLocaleString('en-NG', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500">
            <p className="text-gray-500 text-xs font-medium">Total Refunded</p>
            <p className="text-lg font-bold text-orange-600 mt-1">
              ₦{totalRefunded.toLocaleString('en-NG', { minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Transactions Table */}
        <TransactionsTable transactions={enrichedTransactions} />
      </div>
    </div>
  );
}