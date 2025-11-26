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

export async function getAllDisputes(filters?: {
  search?: string;
  status?: string;
  priority?: string;
  raisedBy?: string;
}) {
  try {
    const supabase = await createServerSupabaseClient();

    // --- PART 1: The Query for the Table (Filtered) ---
    let query = supabase
      .from('disputes')
      .select(`
        *,
        order:orders!disputes_order_id_fkey(
          id, order_number, total_amount, payment_method, order_status,
          buyer:profiles!orders_buyer_id_fkey(id, full_name, email, state, university:universities!profiles_university_id_fkey(name)),
          seller:sellers!orders_seller_id_fkey(id, business_name, full_name, email, state, university:universities!sellers_university_id_fkey(name)),
          product:products(id, name, image_urls)
        ),
        resolved_by:admins!disputes_resolved_by_admin_id_fkey(id, full_name, email)
      `)
      .order('created_at', { ascending: false });

    // Apply filters to the LIST query only
    if (filters?.search) {
      query = query.or(`description.ilike.%${filters.search}%,order.order_number.ilike.%${filters.search}%`);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }
    if (filters?.raisedBy && filters.raisedBy !== 'all') {
      query = query.eq('raised_by_type', filters.raisedBy);
    }

    // --- PART 2: The Queries for the Stats Cards (Unfiltered by Tab) ---
    // We run these in parallel using Promise.all for speed.
    // We intentionally do NOT apply the 'status' filter here so the cards stay stable.

    const [
      listResult,
      totalResult,
      openResult,
      underReviewResult,
      resolvedResult,
      highPriorityResult
    ] = await Promise.all([
      query, // The main list data
      supabase.from('disputes').select('*', { count: 'exact', head: true }), // Total
      supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'), // Open
      supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'under_review'), // Under Review
      supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'resolved'), // Resolved
      supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('priority', 'high') // High Priority
    ]);

    if (listResult.error) {
      console.error('❌ Disputes Query Error:', listResult.error);
      throw listResult.error;
    }

    return {
      disputes: listResult.data || [],
      counts: {
        total: totalResult.count || 0,
        open: openResult.count || 0,
        under_review: underReviewResult.count || 0,
        resolved: resolvedResult.count || 0,
        high_priority: highPriorityResult.count || 0
      },
      error: null
    };
  } catch (err) {
    console.error('❌ Error fetching disputes:', err);
    return {
      disputes: [],
      counts: { total: 0, open: 0, under_review: 0, resolved: 0, high_priority: 0 },
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function getDisputeDetails(disputeId: string) {
  console.log('\n========================================');
  console.log('🔍 SERVER: getDisputeDetails called');
  console.log('Dispute ID:', disputeId);
  console.log('========================================\n');
  
  try {
    console.log('📌 Step 1: Creating admin Supabase client...');
    const { createAdminSupabaseClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminSupabaseClient();
    console.log('✅ Admin client created');

    console.log('📌 Step 2: Executing database query...');
    const { data, error } = await supabase
      .from('disputes')
      .select(`
        *,
        order:orders!disputes_order_id_fkey(
          id,
          order_number,
          total_amount,
          payment_method,
          payment_status,
          order_status,
          escrow_amount,
          escrow_released,
          delivery_code,
          buyer:profiles!orders_buyer_id_fkey(
            id,
            full_name,
            email,
            phone_number,
            state
          ),
          seller:sellers!orders_seller_id_fkey(
            id,
            business_name,
            full_name,
            email,
            phone_number,
            state
          ),
          product:products(
            id,
            name,
            image_urls,
            condition,
            brand
          ),
         delivery_address:delivery_addresses(
  id,
  address_line,
  city,
  state,
  landmark,
  phone_number
)
        ),
        resolved_by:admins!disputes_resolved_by_admin_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('id', disputeId)
      .single();

    console.log('📌 Step 3: Query executed');
    console.log('Has error?', !!error);
    console.log('Has data?', !!data);

    if (error) {
      console.error('❌ Database error details:');
      console.error('  Code:', error.code);
      console.error('  Message:', error.message);
      console.error('  Details:', error.details);
      console.error('  Hint:', error.hint);
      throw error;
    }

    if (!data) {
      console.error('❌ No data returned for dispute:', disputeId);
      throw new Error('Dispute not found');
    }

    console.log('✅ Raw data received:');
    console.log('  Dispute ID:', data.id);
    console.log('  Status:', data.status);
    console.log('  Has order?', !!data.order);
    console.log('  Order type:', Array.isArray(data.order) ? 'Array' : typeof data.order);
    
    if (data.order) {
      const order = Array.isArray(data.order) ? data.order[0] : data.order;
      console.log('  Order details:');
      console.log('    - Order number:', order?.order_number);
      console.log('    - Has buyer?', !!order?.buyer);
      console.log('    - Buyer type:', Array.isArray(order?.buyer) ? 'Array' : typeof order?.buyer);
      console.log('    - Has seller?', !!order?.seller);
      console.log('    - Seller type:', Array.isArray(order?.seller) ? 'Array' : typeof order?.seller);
      console.log('    - Has product?', !!order?.product);
      console.log('    - Product type:', Array.isArray(order?.product) ? 'Array' : typeof order?.product);
    }

    console.log('📌 Step 4: Transforming data...');
    // Transform arrays to single objects
    const transformedDispute = {
      ...data,
      order: Array.isArray(data.order) ? data.order[0] : data.order,
      resolved_by: Array.isArray(data.resolved_by) ? data.resolved_by[0] : data.resolved_by,
    };

    if (transformedDispute.order) {
      transformedDispute.order.buyer = Array.isArray(transformedDispute.order.buyer) 
        ? transformedDispute.order.buyer[0] 
        : transformedDispute.order.buyer;
      transformedDispute.order.seller = Array.isArray(transformedDispute.order.seller) 
        ? transformedDispute.order.seller[0] 
        : transformedDispute.order.seller;
      transformedDispute.order.product = Array.isArray(transformedDispute.order.product) 
        ? transformedDispute.order.product[0] 
        : transformedDispute.order.product;
      transformedDispute.order.delivery_address = Array.isArray(transformedDispute.order.delivery_address) 
        ? transformedDispute.order.delivery_address[0] 
        : transformedDispute.order.delivery_address;
    }

    console.log('✅ Data transformed successfully');
    console.log('📌 Step 5: Returning result...');
    console.log('========================================');
    console.log('✅ SUCCESS: Returning dispute data');
    console.log('========================================\n');

    return { dispute: transformedDispute, error: null };
  } catch (err) {
    console.error('\n========================================');
    console.error('💥 ERROR in getDisputeDetails');
    console.error('Error type:', typeof err);
    console.error('Error instanceof Error:', err instanceof Error);
    if (err instanceof Error) {
      console.error('  Name:', err.name);
      console.error('  Message:', err.message);
      console.error('  Stack:', err.stack);
    } else {
      console.error('  Raw error:', err);
    }
    console.error('========================================\n');
    
    return {
      dispute: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function updateDisputeStatus(
  disputeId: string,
  status: 'open' | 'under_review' | 'resolved' | 'closed'
) {
  try {
    const { supabase, admin } = await verifyAdmin();

    const { error } = await supabase
      .from('disputes')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId);

    if (error) throw error;

    revalidatePath('/admin/disputes');
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function updateDisputePriority(
  disputeId: string,
  priority: 'low' | 'medium' | 'high'
) {
  try {
    const { supabase, admin } = await verifyAdmin();

    const { error } = await supabase
      .from('disputes')
      .update({
        priority,
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId);

    if (error) throw error;

    revalidatePath('/admin/disputes');
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function resolveDispute(
  disputeId: string,
  action: 'refund_buyer' | 'release_to_seller' | 'partial_refund' | 'cancelled' | 'no_action',
  resolution: string,
  adminNotes?: string
) {
  try {
    const { supabase, admin } = await verifyAdmin();

    // Get dispute and order details
    const { data: dispute, error: disputeError } = await supabase
      .from('disputes')
      .select(`
        *,
        order:orders!disputes_order_id_fkey(
          id,
          order_number,
          buyer_id,
          seller_id,
          escrow_amount,
          product:products(name)
        )
      `)
      .eq('id', disputeId)
      .single();

    if (disputeError || !dispute) throw new Error('Dispute not found');

    const orderData = Array.isArray(dispute.order) ? dispute.order[0] : dispute.order;

    // Update dispute record
    const { error: updateError } = await supabase
      .from('disputes')
      .update({
        status: 'resolved',
        admin_action: action,
        resolution,
        admin_notes: adminNotes,
        resolved_by_admin_id: admin.id,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId);

    if (updateError) throw updateError;

    const productData = Array.isArray(orderData.product) ? orderData.product[0] : orderData.product;

    // Execute the action
    if (action === 'refund_buyer') {
      // Call your existing refund function
      const { data: refundResult, error: refundError } = await supabase.functions.invoke('refund-escrow', {
        body: {
          orderId: orderData.id,
          reason: `Dispute resolved - ${resolution}`,
          isAutoRefund: false,
        },
      });

      if (refundError) {
        console.error('❌ Refund error:', refundError);
        throw new Error(`Refund failed: ${refundError.message}`);
      }

      // Notify buyer and seller
      await supabase.from('notifications').insert([
        {
          user_id: orderData.buyer_id,
          type: 'dispute_resolved',
          title: 'Dispute Resolved - Refund Issued ✅',
          message: `Your dispute for "${productData?.name}" has been resolved. A refund has been processed.`,
          is_read: false,
        },
        {
          user_id: orderData.seller_id,
          type: 'dispute_resolved',
          title: 'Dispute Resolved',
          message: `Dispute for "${productData?.name}" has been resolved in favor of the buyer.`,
          is_read: false,
        },
      ]);
    } else if (action === 'release_to_seller') {
      // Release escrow to seller
      const { error: releaseError } = await supabase
        .from('orders')
        .update({
          escrow_released: true,
          order_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderData.id);

      if (releaseError) throw releaseError;

      // Update seller wallet
      const { data: seller } = await supabase
        .from('sellers')
        .select('wallet_balance')
        .eq('id', orderData.seller_id)
        .single();

      if (seller) {
        const escrowAmount = parseFloat(orderData.escrow_amount || '0');
        const newBalance = parseFloat(seller.wallet_balance || '0') + escrowAmount;
        await supabase
          .from('sellers')
          .update({ wallet_balance: newBalance.toString() })
          .eq('id', orderData.seller_id);
      }

      // Notify both parties
      await supabase.from('notifications').insert([
        {
          user_id: orderData.seller_id,
          type: 'dispute_resolved',
          title: 'Dispute Resolved - Payment Released 💰',
          message: `Your dispute for "${productData?.name}" has been resolved. Payment has been released to your wallet.`,
          is_read: false,
        },
        {
          user_id: orderData.buyer_id,
          type: 'dispute_resolved',
          title: 'Dispute Resolved',
          message: `Dispute for "${productData?.name}" has been resolved in favor of the seller.`,
          is_read: false,
        },
      ]);
    } else if (action === 'cancelled') {
      // Cancel the order
      await supabase
        .from('orders')
        .update({
          order_status: 'cancelled',
          notes: `Dispute resolution: ${resolution}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderData.id);

      // Notify both parties
      await supabase.from('notifications').insert([
        {
          user_id: orderData.buyer_id,
          type: 'dispute_resolved',
          title: 'Dispute Resolved - Order Cancelled',
          message: `Your dispute for "${productData?.name}" has been resolved. The order has been cancelled.`,
          is_read: false,
        },
        {
          user_id: orderData.seller_id,
          type: 'dispute_resolved',
          title: 'Dispute Resolved - Order Cancelled',
          message: `Dispute for "${productData?.name}" has been resolved. The order has been cancelled.`,
          is_read: false,
        },
      ]);
    } else if (action === 'no_action') {
      // Just close the dispute with notifications
      await supabase.from('notifications').insert([
        {
          user_id: orderData.buyer_id,
          type: 'dispute_resolved',
          title: 'Dispute Resolved',
          message: `Your dispute for "${productData?.name}" has been reviewed and closed.`,
          is_read: false,
        },
        {
          user_id: orderData.seller_id,
          type: 'dispute_resolved',
          title: 'Dispute Resolved',
          message: `Dispute for "${productData?.name}" has been reviewed and closed.`,
          is_read: false,
        },
      ]);
    }

    revalidatePath('/admin/disputes');
    return { success: true, error: null };
  } catch (err) {
    console.error('❌ Resolve dispute error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function addAdminNotes(disputeId: string, notes: string) {
  try {
    const { supabase, admin } = await verifyAdmin();

    const { error } = await supabase
      .from('disputes')
      .update({
        admin_notes: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId);

    if (error) throw error;

    revalidatePath('/admin/disputes');
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}