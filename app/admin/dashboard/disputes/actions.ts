'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check both admins table and profiles with admin role
  const { data: admin } = await supabase
    .from('admins')
    .select('id, email, full_name, role')
    .eq('email', user.email)
    .maybeSingle();

  if (!admin) {
    // Fallback: check if user is admin in profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'admin' || profile?.role === 'super_admin') {
      return { 
        supabase, 
        admin: { 
          id: profile.id, 
          email: profile.email || user.email,
          full_name: profile.full_name || 'Admin',
          role: profile.role 
        }, 
        user 
      };
    }
    
    throw new Error('Admin access required');
  }

  return { supabase, admin, user };
}

export async function getAllDisputes(filters?: {
  search?: string;
  status?: string;
  priority?: string;
  raisedBy?: string;
  assignmentFilter?: 'all' | 'unassigned' | 'assigned' | 'my_disputes';
  currentAdminId?: string;
}) {
  try {
    const supabase = await createServerSupabaseClient();

    // --- PART 1: The Query for the Table (Filtered) ---
    let query = supabase
  .from('disputes')
  .select(`
    *,
    dispute_number,
    order:orders(
      id, order_number, total_amount, payment_method, order_status,
      buyer:profiles(id, full_name, email, state),
      seller:sellers(id, business_name, full_name, email, state),
      product:products(id, name, image_urls)
    ),
    resolved_by:admins!disputes_resolved_by_admin_id_fkey(id, full_name, email, role, admin_number),
    assigned_to:profiles!disputes_assigned_to_admin_id_fkey(id, full_name, email)
  `)
  .order('created_at', { ascending: false });

    // Apply filters to the LIST query only
    // Apply filters to the LIST query only
if (filters?.search) {
  query = query.or(`description.ilike.%${filters.search}%,order.order_number.ilike.%${filters.search}%,dispute_number.ilike.%${filters.search}%`);
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

    // Assignment filters
    // Assignment filters
if (filters?.assignmentFilter === 'unassigned') {
  query = query.is('assigned_to_admin_id', null).neq('status', 'resolved').neq('status', 'closed');
} else if (filters?.assignmentFilter === 'assigned') {
  query = query.not('assigned_to_admin_id', 'is', null).neq('status', 'resolved').neq('status', 'closed');
} else if (filters?.assignmentFilter === 'my_disputes' && filters?.currentAdminId) {
  query = query.eq('assigned_to_admin_id', filters.currentAdminId).neq('status', 'resolved').neq('status', 'closed');
}

    // --- PART 2: The Queries for the Stats Cards (Unfiltered by Tab) ---
    const [
      listResult,
      totalResult,
      openResult,
      underReviewResult,
      resolvedResult,
      highPriorityResult,
      unassignedResult,
      myDisputesResult
    ] = await Promise.all([
      query,
      supabase.from('disputes').select('*', { count: 'exact', head: true }),
      supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'under_review'),
      supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
      supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('priority', 'high'),
      supabase.from('disputes').select('*', { count: 'exact', head: true }).is('assigned_to_admin_id', null),
      filters?.currentAdminId 
        ? supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('assigned_to_admin_id', filters.currentAdminId)
        : Promise.resolve({ count: 0 })
    ]);

    if (listResult.error) {
  console.error('❌ Disputes Query Error:', listResult.error);
  throw listResult.error;
}

// Fetch admin info for assigned disputes
const disputesWithAdminInfo = await Promise.all(
  (listResult.data || []).map(async (dispute: any) => {
    if (dispute.assigned_to_admin_id) {
      const { data: adminData } = await supabase
        .from('admins')
        .select('id, full_name, email, role, admin_number')
        .eq('id', dispute.assigned_to_admin_id)
        .single();
      
      if (adminData) {
        dispute.assigned_to = adminData;
      }
    }
    return dispute;
  })
);

return {
  disputes: disputesWithAdminInfo,
  counts: {
        total: totalResult.count || 0,
        open: openResult.count || 0,
        under_review: underReviewResult.count || 0,
        resolved: resolvedResult.count || 0,
        high_priority: highPriorityResult.count || 0,
        unassigned: unassignedResult.count || 0,
        my_disputes: myDisputesResult.count || 0
      },
      error: null
    };
  } catch (err) {
    console.error('❌ Error fetching disputes:', err);
    return {
      disputes: [],
      counts: { total: 0, open: 0, under_review: 0, resolved: 0, high_priority: 0, unassigned: 0, my_disputes: 0 },
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
export async function getDisputeDetails(disputeId: string) {
  try {
    const { createAdminSupabaseClient } = await import('@/lib/supabase/admin');
    const supabase = createAdminSupabaseClient();

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

    if (error) throw error;
    if (!data) throw new Error('Dispute not found');

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

    return { dispute: transformedDispute, error: null };
  } catch (err) {
    console.error('ERROR in getDisputeDetails:', err);
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
    const { supabase } = await verifyAdmin();

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
    const { supabase } = await verifyAdmin();

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
      // Call your existing refund function (Updated to handle wallet deduction)
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

      // Notifications (Edge function sends primary ones, these are admin audit/backups)
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

      // --- CRITICAL UPDATE: NEW LEDGER LOGIC ---
      
      const { data: seller } = await supabase
        .from('sellers')
        .select('available_balance') // Fetch available_balance instead of wallet_balance
        .eq('id', orderData.seller_id)
        .single();

      if (seller) {
        const escrowAmount = parseFloat(orderData.escrow_amount || '0');
        const currentBalance = parseFloat((seller.available_balance || 0).toString());
        const newBalance = currentBalance + escrowAmount;

        // 1. Update Balance
        await supabase
          .from('sellers')
          .update({ 
            available_balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderData.seller_id);

        // 2. Log Transaction (so it shows in history)
        await supabase
          .from('wallet_transactions')
          .insert({
            seller_id: orderData.seller_id,
            transaction_type: 'credit',
            amount: escrowAmount,
            status: 'cleared', // Cleared immediately because Admin released it
            description: `Dispute resolved: Funds released for order #${orderData.order_number}`,
            reference: orderData.id,
            balance_after: newBalance,
            clears_at: new Date().toISOString() // Cleared now
          });
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
export async function assignDisputeToMe(disputeId: string) {
  try {
    const { supabase, admin } = await verifyAdmin();

    const now = new Date().toISOString();

    // Update dispute
    const { error: updateError } = await supabase
      .from('disputes')
      .update({
        assigned_to_admin_id: admin.id,
        assigned_at: now,
      })
      .eq('id', disputeId);

    if (updateError) throw updateError;

    // Create assignment record
    await supabase
      .from('dispute_assignments')
      .insert({
        dispute_id: disputeId,
        admin_id: admin.id,
        assigned_by_admin_id: admin.id,
        assigned_at: now,
      });

    revalidatePath('/admin/dashboard/disputes');
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function unassignDispute(disputeId: string) {
  try {
    const { supabase } = await verifyAdmin();

    const now = new Date().toISOString();

    // Update dispute
    const { error: updateError } = await supabase
      .from('disputes')
      .update({
        assigned_to_admin_id: null,
        assigned_at: null,
      })
      .eq('id', disputeId);

    if (updateError) throw updateError;

    // Update assignment record
    await supabase
      .from('dispute_assignments')
      .update({ unassigned_at: now })
      .eq('dispute_id', disputeId)
      .is('unassigned_at', null);

    revalidatePath('/admin/dashboard/disputes');
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function assignDisputeToAdmin(disputeId: string, adminId: string) {
  try {
    const { supabase, admin } = await verifyAdmin();

    const now = new Date().toISOString();

    // Update dispute
    const { error: updateError } = await supabase
      .from('disputes')
      .update({
        assigned_to_admin_id: adminId,
        assigned_at: now,
      })
      .eq('id', disputeId);

    if (updateError) throw updateError;

    // Create assignment record
    await supabase
      .from('dispute_assignments')
      .insert({
        dispute_id: disputeId,
        admin_id: adminId,
        assigned_by_admin_id: admin.id,
        assigned_at: now,
      });

    revalidatePath('/admin/dashboard/disputes');
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function getAdminsList() {
  try {
    const { supabase } = await verifyAdmin();

    const { data, error } = await supabase
      .from('admins')
      .select('id, full_name, email, role, admin_number')
      .order('full_name');

    if (error) throw error;

    return { admins: data || [], error: null };
  } catch (err) {
    return {
      admins: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
export async function getDisputeInternalNotes(disputeId: string) {
  try {
    const { supabase } = await verifyAdmin();

    const { data, error } = await supabase
      .from('admin_dispute_notes')
      .select(`
        *,
        admin:profiles!admin_dispute_notes_admin_id_fkey(id, full_name, email)
      `)
      .eq('dispute_id', disputeId)
      .eq('is_internal', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { notes: data || [], error: null };
  } catch (err) {
    return {
      notes: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function addDisputeInternalNote(disputeId: string, note: string) {
  try {
    const { supabase, admin } = await verifyAdmin();

    const { error } = await supabase
      .from('admin_dispute_notes')
      .insert({
        dispute_id: disputeId,
        admin_id: admin.id,
        note: note.trim(),
        is_internal: true,
      });

    if (error) throw error;

    revalidatePath('/admin/dashboard/disputes');
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}