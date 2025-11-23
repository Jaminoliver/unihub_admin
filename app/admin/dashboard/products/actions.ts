'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
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

export async function getSellers() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('sellers')
      .select('id, business_name, full_name, email')
      .order('business_name');

    if (error) throw error;
    return { sellers: data || [], error: null };
  } catch (err) {
    return { sellers: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getApprovalQueue(search?: string, sellerId?: string) {
  try {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('products')
      .select(`*, sellers:seller_id (id, business_name, full_name, email, phone_number, state, university:universities(name))`)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (search) query = query.ilike('name', `%${search}%`);
    if (sellerId && sellerId !== 'all') query = query.eq('seller_id', sellerId);

    const { data, error } = await query;
    if (error) throw error;

    const transformedData = data?.map((product: any) => ({
      id: product.id,
      product_id: product.id,
      status: 'pending',
      rejection_reason: null,
      created_at: product.created_at,
      products: { ...product, sellers: Array.isArray(product.sellers) ? product.sellers[0] : product.sellers },
    }));

    return { products: transformedData || [], error: null, count: transformedData?.length || 0 };
  } catch (err) {
    return { products: [], error: err instanceof Error ? err.message : 'Unknown error', count: 0 };
  }
}

export async function getAllProducts(search?: string, status?: string, sellerId?: string) {
  try {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('products')
      .select(`*, sellers:seller_id (id, business_name, full_name, email, phone_number, state, university:universities(name))`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (search) query = query.ilike('name', `%${search}%`);
    if (status === 'active') query = query.eq('is_available', true).eq('is_suspended', false).eq('admin_suspended', false);
    else if (status === 'suspended') query = query.or('is_suspended.eq.true,admin_suspended.eq.true');
    else if (status === 'inactive') query = query.eq('is_available', false);
    if (sellerId && sellerId !== 'all') query = query.eq('seller_id', sellerId);

    const { data, error } = await query;
    if (error) throw error;

    // Fetch real stats for each product
    const productsWithStats = await Promise.all(
      (data || []).map(async (product: any) => {
        const [viewsResult, ordersResult] = await Promise.all([
          supabase.from('product_views').select('*', { count: 'exact', head: true }).eq('product_id', product.id),
          supabase.from('orders').select('quantity').eq('product_id', product.id),
        ]);

        const totalSold = ordersResult.data?.reduce((sum, order) => sum + (parseInt(order.quantity) || 0), 0) || 0;

        return {
          ...product,
          view_count: viewsResult.count || 0,
          sold_count: totalSold,
          delivery_count: 0,
          favorite_count: product.wishlist_count || 0,
          review_count: 0,
          average_rating: 0,
          sellers: Array.isArray(product.sellers) ? product.sellers[0] : product.sellers,
        };
      })
    );

    return { products: productsWithStats, error: null };
  } catch (err) {
    return { products: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getProductDetails(productId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('products')
      .select(`*, sellers:seller_id (id, business_name, full_name, email, phone_number, state, university_id, universities:university_id (id, name, state)), product_approvals (id, status, rejection_reason, created_at)`)
      .eq('id', productId)
      .single();

    if (error) throw error;
    return { product: data, error: null };
  } catch (err) {
    return { product: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getProductRealtimeStats(productId: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { count: wishlistCount } = await supabase.from('wishlist').select('*', { count: 'exact', head: true }).eq('product_id', productId);
    const { data: reviews } = await supabase.from('reviews').select('rating').eq('product_id', productId);

    return {
      success: true,
      data: { 
        favoriteCount: wishlistCount || 0, 
        reviewCount: reviews?.length || 0,
        averageRating: reviews?.length ? reviews.reduce((sum: number, r: any) => sum + parseFloat(r.rating || '0'), 0) / reviews.length : 0
      }
    };
  } catch (err) {
    return { success: false, data: null };
  }
}

export async function approveProduct(productId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: admin } = await supabase.from('admins').select('id').eq('email', user.email).maybeSingle();

    await supabase.from('product_approvals').update({
      status: 'approved',
      approved_by: admin?.id || null,
      approved_at: new Date().toISOString(),
    }).eq('product_id', productId);

    const { error } = await supabase.from('products').update({
      is_available: true,
      approval_status: 'approved',
      updated_at: new Date().toISOString(),
    }).eq('id', productId);

    if (error) throw error;

    const { data: product } = await supabase.from('products').select('seller_id, name').eq('id', productId).single();
    if (product) {
      await supabase.from('notifications').insert({
        user_id: product.seller_id,
        type: 'product_approved',
        title: 'Product Approved ✅',
        message: `Your product "${product.name}" has been approved and is now live!`,
        is_read: false,
      });
    }

    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function rejectProduct(productId: string, reason: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: admin } = await supabase.from('admins').select('id').eq('email', user.email).maybeSingle();

    await supabase.from('product_approvals').update({
      status: 'rejected',
      rejection_reason: reason,
      approved_by: admin?.id || null,
      approved_at: new Date().toISOString(),
    }).eq('product_id', productId);

    const { error } = await supabase.from('products').update({
      is_available: false,
      approval_status: 'rejected',
      updated_at: new Date().toISOString(),
    }).eq('id', productId);

    if (error) throw error;

    const { data: product } = await supabase.from('products').select('seller_id, name').eq('id', productId).single();
    if (product) {
      await supabase.from('notifications').insert({
        user_id: product.seller_id,
        type: 'product_rejected',
        title: 'Product Rejected ❌',
        message: `Your product "${product.name}" was rejected. Reason: ${reason}`,
        is_read: false,
      });
    }

    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function bulkApproveProducts(productIds: string[]) {
  try {
    const { supabase, admin } = await verifyAdmin();

    await supabase.from('product_approvals').update({
      status: 'approved',
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
    }).in('product_id', productIds);

    const { error } = await supabase.from('products').update({
      is_available: true,
      approval_status: 'approved',
      updated_at: new Date().toISOString(),
    }).in('id', productIds);

    if (error) throw error;
    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function bulkRejectProducts(productIds: string[], reason: string) {
  try {
    const { supabase, admin } = await verifyAdmin();

    await supabase.from('product_approvals').update({
      status: 'rejected',
      rejection_reason: reason,
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
    }).in('product_id', productIds);

    const { error } = await supabase.from('products').update({
      is_available: false,
      approval_status: 'rejected',
      updated_at: new Date().toISOString(),
    }).in('id', productIds);

    if (error) throw error;
    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function toggleProductSuspension(productId: string, isSuspended: boolean, reason?: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('products').update({
      admin_suspended: isSuspended,
      admin_suspended_at: isSuspended ? new Date().toISOString() : null,
      admin_suspended_by: isSuspended ? user?.id : null,
      admin_suspension_reason: isSuspended ? reason : null,
      is_available: !isSuspended
    }).eq('id', productId);

    if (error) throw error;
    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function suspendSellerProducts(sellerId: string, reason: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('products').update({
      admin_suspended: true,
      admin_suspended_at: new Date().toISOString(),
      admin_suspended_by: user?.id,
      admin_suspension_reason: `Bulk Suspension: ${reason}`,
      is_available: false
    }).eq('seller_id', sellerId);

    if (error) throw error;
    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function banProduct(productId: string, reason: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('products').update({
      is_banned: true,
      banned_at: new Date().toISOString(),
      banned_by: user.id,
      ban_reason: reason,
      is_available: false,
      admin_suspended: true,
    }).eq('id', productId);

    if (error) throw error;

    const { data: product } = await supabase.from('products').select('seller_id, name').eq('id', productId).single();
    if (product) {
      await supabase.from('notifications').insert({
        user_id: product.seller_id,
        type: 'product_banned',
        title: 'Product Banned 🚫',
        message: `Your product "${product.name}" has been permanently banned. Reason: ${reason}`,
        is_read: false,
      });
    }

    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function unbanProduct(productId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('products').update({
      is_banned: false,
      banned_at: null,
      banned_by: null,
      ban_reason: null,
    }).eq('id', productId);

    if (error) throw error;
    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getAppeals() {
  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from('appeals')
      .select(`*, products (id, name, price, image_urls, admin_suspension_reason, admin_suspended), sellers (id, business_name, full_name)`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { appeals: data || [], error: null };
  } catch (error) {
    return { appeals: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function approveAppeal(appealId: string, productId: string) {
  try {
    const supabase = createAdminSupabaseClient();

    const { error: appealError } = await supabase
      .from('appeals')
      .update({ status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', appealId);

    if (appealError) throw new Error(`Failed to update appeal: ${appealError.message}`);

    const { error: productError } = await supabase.from('products').update({
      admin_suspended: false,
      admin_suspension_reason: null,
      admin_suspended_at: null,
      admin_suspended_by: null,
      is_available: true,
      updated_at: new Date().toISOString(),
    }).eq('id', productId);

    if (productError) {
      await supabase.from('appeals').update({ status: 'pending' }).eq('id', appealId);
      throw new Error(`Failed to unsuspend product: ${productError.message}`);
    }

    const { data: product } = await supabase.from('products').select('seller_id, name').eq('id', productId).single();
    if (product) {
      await supabase.from('notifications').insert({
        user_id: product.seller_id,
        type: 'appeal_approved',
        title: 'Appeal Approved ✅',
        message: `Your appeal for "${product.name}" has been approved. The product is now live again!`,
        is_read: false,
      });
    }

    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function rejectAppeal(appealId: string, reason: string) {
  try {
    const supabase = createAdminSupabaseClient();

    const { error } = await supabase.from('appeals').update({
      status: 'rejected',
      admin_reason: reason,
      updated_at: new Date().toISOString(),
    }).eq('id', appealId);

    if (error) throw new Error(`Failed to reject appeal: ${error.message}`);

    const { data: appealData } = await supabase
      .from('appeals')
      .select(`product_id, products!inner (seller_id, name)`)
      .eq('id', appealId)
      .single();

    if (appealData?.products) {
      const product = Array.isArray(appealData.products) ? appealData.products[0] : appealData.products;
      if (product?.seller_id && product?.name) {
        await supabase.from('notifications').insert({
          user_id: product.seller_id,
          type: 'appeal_rejected',
          title: 'Appeal Rejected ❌',
          message: `Your appeal for "${product.name}" has been rejected. Reason: ${reason}`,
          is_read: false,
        });
      }
    }

    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function getCategories() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return { categories: data || [], error: null };
  } catch (err) {
    return { categories: [], error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createCategory(name: string, description?: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('categories').insert({ name, description });
    if (error) throw error;
    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function updateCategory(categoryId: string, name: string, description?: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('categories').update({ name, description }).eq('id', categoryId);
    if (error) throw error;
    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    if (error) throw error;
    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}