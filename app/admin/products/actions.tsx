'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// --- SELLERS ---
export async function getSellers() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('sellers')
      .select('id, business_name, full_name, email')
      .order('business_name');

    if (error) throw error;

    return {
      sellers: data || [],
      error: null,
    };
  } catch (err) {
    console.error('Error fetching sellers:', err);
    return {
      sellers: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// --- APPROVAL QUEUE ---
export async function getApprovalQueue(search?: string, sellerId?: string) {
  try {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from('product_approvals')
      .select(`
        id,
        product_id,
        status,
        rejection_reason,
        created_at,
        products:product_id!inner (
          id,
          name,
          description,
          price,
          condition,
          stock_quantity,
          image_urls,
          seller_id,
          brand,
          sku,
          sellers:seller_id!inner (
            id,
            business_name,
            full_name,
            email,
            state,
            university_id,
            universities:university_id (
              id,
              name,
              state
            )
          )
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.ilike('products.name', `%${search}%`);
    }

    if (sellerId && sellerId !== 'all') {
      query = query.eq('products.seller_id', sellerId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform the data with proper null checks
    const transformedData = data
      ?.map((item: any) => {
        const product = Array.isArray(item.products) ? item.products[0] : item.products;
        if (!product || !product.id) return null;

        const seller = Array.isArray(product.sellers) ? product.sellers[0] : product.sellers;
        const university = seller && Array.isArray(seller.universities) ? seller.universities[0] : seller?.universities;

        return {
          ...item,
          products: {
            ...product,
            sellers: seller ? {
              ...seller,
              universities: university || null,
            } : null,
          },
        };
      })
      .filter(Boolean);

    return {
      products: transformedData || [],
      error: null,
      count: transformedData?.length || 0,
    };
  } catch (err) {
    console.error('Error fetching approval queue:', err);
    return {
      products: [],
      error: err instanceof Error ? err.message : 'Unknown error',
      count: 0,
    };
  }
}

// --- ALL PRODUCTS (Updated for Detailed View & Filtering) ---
export async function getAllProducts(search?: string, status?: string, sellerId?: string) {
  try {
    const supabase = await createServerSupabaseClient();

    // Fetch '*' to get stats like sold_count, view_count, etc.
    let query = supabase
      .from('products')
      .select(`
        *,
        sellers:seller_id (
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

    // Search Filter
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Status Filter
    if (status === 'active') {
      query = query.eq('is_available', true).eq('is_suspended', false).eq('admin_suspended', false);
    } else if (status === 'suspended') {
      // Shows products suspended by User OR Admin
      query = query.or('is_suspended.eq.true,admin_suspended.eq.true');
    } else if (status === 'inactive') {
      query = query.eq('is_available', false);
    }

    // Seller Filter
    if (sellerId && sellerId !== 'all') {
      query = query.eq('seller_id', sellerId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Transform for UI
    const transformedData = data?.map((product: any) => {
      const sellerData = Array.isArray(product.sellers) ? product.sellers[0] : product.sellers;
      
      return {
        ...product,
        sellers: sellerData ? {
          ...sellerData,
          university: Array.isArray(sellerData.university) ? sellerData.university[0] : sellerData.university
        } : null,
      };
    });

    return {
      products: transformedData || [],
      error: null,
    };
  } catch (err) {
    console.error('Error fetching all products:', err);
    return {
      products: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// --- SINGLE PRODUCT DETAILS ---
export async function getProductDetails(productId: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        sellers:seller_id (
          id,
          business_name,
          full_name,
          email,
          phone_number,
          state,
          university_id,
          universities:university_id (
            id,
            name,
            state
          )
        ),
        product_approvals (
          id,
          status,
          rejection_reason,
          created_at
        )
      `)
      .eq('id', productId)
      .single();

    if (error) throw error;

    return {
      product: data,
      error: null,
    };
  } catch (err) {
    console.error('Error fetching product details:', err);
    return {
      product: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// --- APPROVAL ACTIONS ---

export async function approveProduct(productId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: admin } = await supabase.from('admins').select('id').eq('email', user.email).single();

    // 1. Update approval record
    const { error: approvalError } = await supabase
      .from('product_approvals')
      .update({
        status: 'approved',
        approved_by: admin?.id || null,
        approved_at: new Date().toISOString(),
      })
      .eq('product_id', productId);

    if (approvalError) throw approvalError;

    // 2. Update product status
    const { error: productError } = await supabase
      .from('products')
      .update({
        is_available: true,
        approval_status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (productError) throw productError;

    // 3. Notify Seller
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
    console.error('Error approving product:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function rejectProduct(productId: string, reason: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: admin } = await supabase.from('admins').select('id').eq('email', user.email).single();

    // 1. Update approval record
    const { error: approvalError } = await supabase
      .from('product_approvals')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        approved_by: admin?.id || null,
        approved_at: new Date().toISOString(),
      })
      .eq('product_id', productId);

    if (approvalError) throw approvalError;

    // 2. Update product status
    const { error: productError } = await supabase
      .from('products')
      .update({
        is_available: false,
        approval_status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (productError) throw productError;

    // 3. Notify Seller
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
    console.error('Error rejecting product:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// --- BULK ACTIONS (Fixing your error) ---

export async function bulkApproveProducts(productIds: string[]) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: admin } = await supabase.from('admins').select('id').eq('email', user.email).single();

    // 1. Approve in product_approvals
    const { error: approvalError } = await supabase
      .from('product_approvals')
      .update({
        status: 'approved',
        approved_by: admin?.id || null,
        approved_at: new Date().toISOString(),
      })
      .in('product_id', productIds);

    if (approvalError) throw approvalError;

    // 2. Activate products
    const { error: productError } = await supabase
      .from('products')
      .update({
        is_available: true,
        approval_status: 'approved',
        updated_at: new Date().toISOString(),
      })
      .in('id', productIds);

    if (productError) throw productError;

    // Optional: Bulk Notify logic could be added here

    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    console.error('Error bulk approving products:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function bulkRejectProducts(productIds: string[], reason: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: admin } = await supabase.from('admins').select('id').eq('email', user.email).single();

    // 1. Reject in product_approvals
    const { error: approvalError } = await supabase
      .from('product_approvals')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        approved_by: admin?.id || null,
        approved_at: new Date().toISOString(),
      })
      .in('product_id', productIds);

    if (approvalError) throw approvalError;

    // 2. Deactivate products
    const { error: productError } = await supabase
      .from('products')
      .update({
        is_available: false,
        approval_status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .in('id', productIds);

    if (productError) throw productError;

    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    console.error('Error bulk rejecting products:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// --- SUSPENSION ACTIONS (For Detailed View) ---

export async function toggleProductSuspension(productId: string, isSuspended: boolean, reason?: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const updates: any = {
      admin_suspended: isSuspended,
      admin_suspended_at: isSuspended ? new Date().toISOString() : null,
      admin_suspended_by: isSuspended ? user?.id : null,
      admin_suspension_reason: isSuspended ? reason : null,
      is_available: isSuspended ? false : undefined 
    };

    // Clean undefined values
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    const { error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId);

    if (error) throw error;

    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    console.error('Error toggling product suspension:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function suspendSellerProducts(sellerId: string, reason: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('products')
      .update({
        admin_suspended: true,
        admin_suspended_at: new Date().toISOString(),
        admin_suspended_by: user?.id,
        admin_suspension_reason: `Bulk Suspension: ${reason}`,
        is_available: false
      })
      .eq('seller_id', sellerId);

    if (error) throw error;

    revalidatePath('/admin/products');
    return { success: true, error: null };
  } catch (err) {
    console.error('Error suspending seller products:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// --- CATEGORY ACTIONS ---

export async function getCategories() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return { categories: data || [], error: null };
  } catch (err) {
    console.error('Error fetching categories:', err);
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
    console.error('Error creating category:', err);
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
    console.error('Error updating category:', err);
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
    console.error('Error deleting category:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}