'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: admin } = await supabase
    .from('admins')
    .select('id, email')
    .eq('email', user.email)
    .maybeSingle();

  if (!admin) throw new Error('Admin access required');
  return { supabase, admin, user };
}

// ============================================
// BUYERS (Profiles) ACTIONS
// ============================================

export async function getAllBuyers(filters?: {
  search?: string;
  state?: string;
  universityId?: string;
  accountStatus?: string;
}) {
  try {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('profiles')
      .select(`
        *,
        university:universities!profiles_university_id_fkey(id, name, state)
      `)
      .eq('is_seller', false)
      .order('created_at', { ascending: false });

    if (filters?.search) {
      query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    if (filters?.state && filters.state !== 'all') {
      query = query.eq('state', filters.state);
    }
    if (filters?.universityId && filters.universityId !== 'all') {
      query = query.eq('university_id', filters.universityId);
    }
    if (filters?.accountStatus && filters.accountStatus !== 'all') {
      query = query.eq('account_status', filters.accountStatus);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Get order counts for each buyer
    const buyersWithStats = await Promise.all(
      (data || []).map(async (buyer) => {
        const { count: ordersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('buyer_id', buyer.id);

        return {
          ...buyer,
          orders_count: ordersCount || 0,
          university: Array.isArray(buyer.university) ? buyer.university[0] : buyer.university,
        };
      })
    );

    return { buyers: buyersWithStats, error: null };
  } catch (err) {
    console.error('❌ Error fetching buyers:', err);
    return { 
      buyers: [], 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

export async function getBuyerDetails(buyerId: string) {
  console.log('🔵 getBuyerDetails called with buyerId:', buyerId);
  
  try {
    // First verify the user is an admin using regular client
    const regularSupabase = await createServerSupabaseClient();
    const { data: { user } } = await regularSupabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: admin } = await regularSupabase
      .from('admins')
      .select('id, email')
      .eq('email', user.email)
      .maybeSingle();

    if (!admin) throw new Error('Admin access required');
    console.log('✅ Admin verified:', admin.email);

    // Now use service role client to bypass RLS and fetch all data
    const supabase = createServiceRoleClient();
    console.log('🔵 Using service role client to bypass RLS');
    
    // Get buyer profile
    console.log('🔵 Fetching buyer profile...');
    const { data: buyer, error: buyerError } = await supabase
      .from('profiles')
      .select(`
        *,
        university:universities!profiles_university_id_fkey(id, name, state)
      `)
      .eq('id', buyerId)
      .single();

    if (buyerError) {
      console.error('❌ Buyer Error:', buyerError);
      throw buyerError;
    }
    console.log('✅ Buyer fetched successfully:', buyer);

    // Get orders with product and seller details
    console.log('🔵 Fetching orders for buyer_id:', buyerId);
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id, 
        order_number, 
        total_amount,
        unit_price,
        quantity,
        order_status, 
        payment_status,
        payment_method,
        created_at,
        updated_at,
        delivery_confirmed_at,
        escrow_amount,
        escrow_released,
        selected_color,
        selected_size,
        product_id,
        seller_id
      `)
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('❌ Orders Error:', ordersError);
      console.error('❌ Orders Error details:', JSON.stringify(ordersError, null, 2));
    } else {
      console.log('✅ Orders fetched successfully. Count:', orders?.length || 0);
      console.log('✅ Orders data:', JSON.stringify(orders, null, 2));
    }

    // Get product details for each order
    const ordersWithProducts: any[] = [];
    if (orders && orders.length > 0) {
      console.log('🔵 Fetching product details for', orders.length, 'orders...');
      for (const order of orders) {
        const { data: product } = await supabase
          .from('products')
          .select('id, name, image_urls, price')
          .eq('id', order.product_id)
          .single();

        const { data: seller } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('id', order.seller_id)
          .single();

        ordersWithProducts.push({
          ...order,
          product: product || null,
          seller: seller || null,
        });
      }
      console.log('✅ Orders with products:', ordersWithProducts.length, 'orders enriched');
    } else {
      console.log('⚠️ No orders found for this buyer');
    }

    // Get transactions
    console.log('🔵 Fetching transactions for user_id:', buyerId);
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', buyerId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (transactionsError) {
      console.error('❌ Transactions Error:', transactionsError);
      console.error('❌ Transactions Error details:', JSON.stringify(transactionsError, null, 2));
    } else {
      console.log('✅ Transactions fetched successfully. Count:', transactions?.length || 0);
      console.log('✅ Transactions data:', JSON.stringify(transactions, null, 2));
    }

    // Get delivery addresses
    console.log('🔵 Fetching delivery addresses for user_id:', buyerId);
    const { data: addresses, error: addressesError } = await supabase
      .from('delivery_addresses')
      .select('*')
      .eq('user_id', buyerId)
      .order('is_default', { ascending: false });

    if (addressesError) {
      console.error('❌ Addresses Error:', addressesError);
      console.error('❌ Addresses Error details:', JSON.stringify(addressesError, null, 2));
    } else {
      console.log('✅ Addresses fetched successfully. Count:', addresses?.length || 0);
      console.log('✅ Addresses data:', JSON.stringify(addresses, null, 2));
    }

    // Get reviews written by this buyer
    const { data: reviews } = await supabase
      .from('reviews')
      .select(`
        id,
        product_id,
        rating,
        comment,
        is_verified_purchase,
        helpful_count,
        created_at,
        order_id
      `)
      .eq('user_id', buyerId)
      .order('created_at', { ascending: false });

    // Get reviews with product details
    const reviewsWithProducts: any[] = [];
    if (reviews && reviews.length > 0) {
      for (const review of reviews) {
        const { data: product } = await supabase
          .from('products')
          .select('id, name, image_urls')
          .eq('id', review.product_id)
          .single();

        reviewsWithProducts.push({
          ...review,
          product: product || null,
        });
      }
    }

    // Get cart items
    const { data: cartItems } = await supabase
      .from('cart')
      .select(`
        id,
        product_id,
        quantity,
        selected_color,
        selected_size,
        created_at
      `)
      .eq('user_id', buyerId);

    // Get cart items with product details
    const cartWithProducts: any[] = [];
    if (cartItems && cartItems.length > 0) {
      for (const item of cartItems) {
        const { data: product } = await supabase
          .from('products')
          .select('id, name, price, image_urls')
          .eq('id', item.product_id)
          .single();

        cartWithProducts.push({
          ...item,
          product: product || null,
        });
      }
    }

    // Get wishlist items
    const { data: wishlistItems } = await supabase
      .from('wishlist')
      .select('id, product_id, created_at')
      .eq('user_id', buyerId);

    // Get wishlist with product details
    const wishlistWithProducts: any[] = [];
    if (wishlistItems && wishlistItems.length > 0) {
      for (const item of wishlistItems) {
        const { data: product } = await supabase
          .from('products')
          .select('id, name, price, image_urls')
          .eq('id', item.product_id)
          .single();

        wishlistWithProducts.push({
          ...item,
          product: product || null,
        });
      }
    }

    // Get escrow records for this buyer
    const { data: escrowRecords } = await supabase
      .from('escrow')
      .select(`
        id,
        order_id,
        amount,
        status,
        hold_until,
        created_at,
        released_at,
        refunded_at,
        refund_reason
      `)
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    // Calculate statistics
    const totalSpent = ordersWithProducts.reduce((sum, order) => {
      if (order.payment_status === 'completed') {
        return sum + parseFloat(order.total_amount || '0');
      }
      return sum;
    }, 0);

    const completedOrders = ordersWithProducts.filter(o => 
      o.order_status === 'delivered' || o.order_status === 'completed'
    ).length;

    const pendingOrders = ordersWithProducts.filter(o => 
      o.order_status === 'pending' || o.order_status === 'confirmed' || o.order_status === 'shipped'
    ).length;

    const statistics = {
      totalOrders: ordersWithProducts.length,
      completedOrders,
      pendingOrders,
      totalSpent,
      averageOrderValue: ordersWithProducts.length > 0 ? totalSpent / ordersWithProducts.length : 0,
      totalReviews: reviewsWithProducts.length,
      cartItemsCount: cartWithProducts.length,
      wishlistItemsCount: wishlistWithProducts.length,
    };

    console.log('✅ Statistics calculated:', statistics);

    const result = { 
      buyer: {
        ...buyer,
        university: Array.isArray(buyer.university) ? buyer.university[0] : buyer.university,
      }, 
      orders: ordersWithProducts,
      transactions: transactions || [],
      addresses: addresses || [],
      reviews: reviewsWithProducts,
      cart: cartWithProducts,
      wishlist: wishlistWithProducts,
      escrow: escrowRecords || [],
      statistics,
      error: null 
    };

    console.log('✅ FINAL RESULT BEING RETURNED:');
    console.log('   - Buyer:', result.buyer?.full_name);
    console.log('   - Orders count:', result.orders.length);
    console.log('   - Transactions count:', result.transactions.length);
    console.log('   - Addresses count:', result.addresses.length);
    console.log('   - Statistics:', result.statistics);
    
    return result;
  } catch (err) {
    console.error('❌ CRITICAL ERROR in getBuyerDetails:', err);
    console.error('❌ Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    return { 
      buyer: null, 
      orders: [], 
      transactions: [],
      addresses: [],
      reviews: [],
      cart: [],
      wishlist: [],
      escrow: [],
      statistics: {
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        totalReviews: 0,
        cartItemsCount: 0,
        wishlistItemsCount: 0,
      },
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}
// SELLERS ACTIONS
// ============================================

export async function getAllSellers(filters?: {
  search?: string;
  state?: string;
  universityId?: string;
  approvalStatus?: string;
  accountStatus?: string;
}) {
  try {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('sellers')
      .select(`
        *,
        university:universities!sellers_university_id_fkey(id, name, state)
      `)
      .order('created_at', { ascending: false });

    if (filters?.search) {
      query = query.or(`business_name.ilike.%${filters.search}%,full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }
    if (filters?.state && filters.state !== 'all') {
      query = query.eq('state', filters.state);
    }
    if (filters?.universityId && filters.universityId !== 'all') {
      query = query.eq('university_id', filters.universityId);
    }
    if (filters?.approvalStatus && filters.approvalStatus !== 'all') {
      query = query.eq('approval_status', filters.approvalStatus);
    }
    if (filters?.accountStatus && filters.accountStatus !== 'all') {
      query = query.eq('account_status', filters.accountStatus);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Get product counts for each seller
    const sellersWithStats = await Promise.all(
      (data || []).map(async (seller) => {
        const { count: productsCount } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', seller.id);

        const { count: ordersCount } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('seller_id', seller.id);

        return {
          ...seller,
          products_count: productsCount || 0,
          orders_count: ordersCount || 0,
          university: Array.isArray(seller.university) ? seller.university[0] : seller.university,
        };
      })
    );

    return { sellers: sellersWithStats, error: null };
  } catch (err) {
    console.error('❌ Error fetching sellers:', err);
    return { 
      sellers: [], 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

export async function getPendingSellers() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('sellers')
      .select(`
        *,
        university:universities!sellers_university_id_fkey(id, name, state)
      `)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const sellersWithStats = (data || []).map((seller) => ({
      ...seller,
      university: Array.isArray(seller.university) ? seller.university[0] : seller.university,
    }));

    return { sellers: sellersWithStats, error: null };
  } catch (err) {
    return { sellers: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getSellerDetails(sellerId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select(`
        *,
        university:universities!sellers_university_id_fkey(id, name, state)
      `)
      .eq('id', sellerId)
      .single();

    if (sellerError) throw sellerError;

    // Get products and orders
    const [productsResult, ordersResult] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, price, approval_status, is_available, created_at')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('orders')
        .select('id, order_number, total_amount, order_status, created_at')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    return { 
      seller: {
        ...seller,
        university: Array.isArray(seller.university) ? seller.university[0] : seller.university,
      }, 
      products: productsResult.data || [],
      orders: ordersResult.data || [],
      error: null 
    };
  } catch (err) {
    return { 
      seller: null, 
      products: [], 
      orders: [], 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

// ============================================
// APPROVAL ACTIONS
// ============================================

export async function approveSeller(sellerId: string) {
  try {
    const { supabase, admin } = await verifyAdmin();

    const { error } = await supabase
      .from('sellers')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: admin.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sellerId);

    if (error) throw error;

    // Get seller details for notification
    const { data: seller } = await supabase
      .from('sellers')
      .select('user_id, business_name, full_name')
      .eq('id', sellerId)
      .single();

    if (seller?.user_id) {
      await supabase.from('notifications').insert({
        user_id: seller.user_id,
        type: 'seller_approved',
        title: 'Seller Account Approved ✅',
        message: `Congratulations! Your seller account "${seller.business_name || seller.full_name}" has been approved. You can now start adding products!`,
        is_read: false,
      });
    }

    revalidatePath('/admin/dashboard/users');
    return { success: true, error: null };
  } catch (err) {
    console.error('❌ Approve seller error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to approve seller' 
    };
  }
}

export async function rejectSeller(sellerId: string, reason: string) {
  try {
    const { supabase, admin } = await verifyAdmin();

    const { error } = await supabase
      .from('sellers')
      .update({
        approval_status: 'rejected',
        rejection_reason: reason,
        rejected_at: new Date().toISOString(),
        approved_by: admin.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sellerId);

    if (error) throw error;

    // Get seller details for notification
    const { data: seller } = await supabase
      .from('sellers')
      .select('user_id, business_name, full_name')
      .eq('id', sellerId)
      .single();

    if (seller?.user_id) {
      await supabase.from('notifications').insert({
        user_id: seller.user_id,
        type: 'seller_rejected',
        title: 'Seller Account Rejected ❌',
        message: `Your seller account "${seller.business_name || seller.full_name}" has been rejected. Reason: ${reason}`,
        is_read: false,
      });
    }

    revalidatePath('/admin/dashboard/users');
    return { success: true, error: null };
  } catch (err) {
    console.error('❌ Reject seller error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to reject seller' 
    };
  }
}

export async function massApproveSellers(sellerIds: string[]) {
  try {
    const { supabase, admin } = await verifyAdmin();

    const { error } = await supabase
      .from('sellers')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: admin.id,
        updated_at: new Date().toISOString(),
      })
      .in('id', sellerIds);

    if (error) throw error;

    // Get all sellers for notifications
    const { data: sellers } = await supabase
      .from('sellers')
      .select('user_id, business_name, full_name')
      .in('id', sellerIds);

    // Send notifications to all approved sellers
    if (sellers && sellers.length > 0) {
      const notifications = sellers
        .filter(s => s.user_id)
        .map(seller => ({
          user_id: seller.user_id,
          type: 'seller_approved',
          title: 'Seller Account Approved ✅',
          message: `Congratulations! Your seller account "${seller.business_name || seller.full_name}" has been approved. You can now start adding products!`,
          is_read: false,
        }));

      await supabase.from('notifications').insert(notifications);
    }

    revalidatePath('/admin/dashboard/users');
    return { success: true, error: null, count: sellerIds.length };
  } catch (err) {
    console.error('❌ Mass approve error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to approve sellers',
      count: 0
    };
  }
}

// ============================================
// BAN/UNBAN ACTIONS
// ============================================

export async function banUser(userId: string, userType: 'buyer' | 'seller', reason: string) {
  try {
    const { supabase } = await verifyAdmin();

    const table = userType === 'buyer' ? 'profiles' : 'sellers';
    const idColumn = userType === 'buyer' ? 'id' : 'user_id';

    const { error } = await supabase
      .from(table)
      .update({
        account_status: 'banned',
        banned_at: new Date().toISOString(),
        ban_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq(idColumn, userId);

    if (error) throw error;

    // Send notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'account_banned',
      title: 'Account Suspended 🚫',
      message: `Your account has been suspended. Reason: ${reason}. Please contact support if you believe this is a mistake.`,
      is_read: false,
    });

    revalidatePath('/admin/dashboard/users');
    return { success: true, error: null };
  } catch (err) {
    console.error('❌ Ban user error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to ban user' 
    };
  }
}

export async function unbanUser(userId: string, userType: 'buyer' | 'seller') {
  try {
    const { supabase } = await verifyAdmin();

    const table = userType === 'buyer' ? 'profiles' : 'sellers';
    const idColumn = userType === 'buyer' ? 'id' : 'user_id';

    const { error } = await supabase
      .from(table)
      .update({
        account_status: 'active',
        banned_at: null,
        ban_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq(idColumn, userId);

    if (error) throw error;

    // Send notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'account_unbanned',
      title: 'Account Restored ✅',
      message: 'Your account has been restored. You can now access all features again.',
      is_read: false,
    });

    revalidatePath('/admin/dashboard/users');
    return { success: true, error: null };
  } catch (err) {
    console.error('❌ Unban user error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Failed to unban user' 
    };
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export async function getUniversities() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('universities')
      .select('id, name, state')
      .order('name');

    if (error) throw error;
    return { universities: data || [], error: null };
  } catch (err) {
    return { universities: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getStates() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('universities')
      .select('state')
      .order('state');

    if (error) throw error;

    // Get unique states
    const uniqueStates = [...new Set(data?.map(u => u.state).filter(Boolean))];
    return { states: uniqueStates, error: null };
  } catch (err) {
    return { states: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}