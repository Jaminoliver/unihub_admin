'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: buyer, error: buyerError } = await supabase
      .from('profiles')
      .select(`
        *,
        university:universities!profiles_university_id_fkey(id, name, state)
      `)
      .eq('id', buyerId)
      .single();

    if (buyerError) throw buyerError;

    // Get orders
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number, total_amount, order_status, created_at')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false })
      .limit(10);

    return { 
      buyer: {
        ...buyer,
        university: Array.isArray(buyer.university) ? buyer.university[0] : buyer.university,
      }, 
      orders: orders || [],
      error: null 
    };
  } catch (err) {
    return { buyer: null, orders: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// ============================================
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