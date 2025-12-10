'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Verify admin authentication
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

// Get all seller disputes with filters
export async function getAllSellerDisputes(filters?: {
  search?: string;
  status?: string;
  priority?: string;
  assignmentFilter?: 'unassigned' | 'assigned' | 'my_disputes';
}) {
  try {
    const { supabase, admin } = await verifyAdmin();

    let query = supabase
      .from('seller_disputes')
      .select(`
        *,
        dispute_number,
        assigned_to_admin_id,
        seller:sellers(
          id,
          business_name,
          full_name,
          email,
          state,
          user:profiles!sellers_user_id_fkey(full_name, email)
        ),
        resolved_by:admins!seller_disputes_resolved_by_admin_id_fkey(id, full_name, email, role, admin_number)
      `)
      .order('created_at', { ascending: false });

    // Search filter
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,dispute_number.ilike.%${filters.search}%`);
    }

    // Status filter
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    // Priority filter
    if (filters?.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }

    // Assignment filter
    if (filters?.assignmentFilter === 'unassigned') {
      query = query.is('assigned_to_admin_id', null)
        .neq('status', 'resolved').neq('status', 'closed');
    } else if (filters?.assignmentFilter === 'my_disputes') {
      query = query.eq('assigned_to_admin_id', admin.id)
        .neq('status', 'resolved').neq('status', 'closed');
    } else if (filters?.assignmentFilter === 'assigned') {
      query = query.not('assigned_to_admin_id', 'is', null);
    }

    const { data: listResult, error: listError } = await query;

    if (listError) {
      console.error('❌ Seller Disputes Query Error:', listError);
      throw listError;
    }

    // Fetch admin info for assigned disputes
    const disputesWithAdminInfo = await Promise.all(
      (listResult || []).map(async (dispute: any) => {
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

    // Calculate counts
    const allDisputes = await supabase
      .from('seller_disputes')
      .select('id, status, priority, assigned_to_admin_id', { count: 'exact', head: false });

    const counts = {
      unassigned: allDisputes.data?.filter(d => !d.assigned_to_admin_id && d.status !== 'resolved' && d.status !== 'closed').length || 0,
      my_disputes: allDisputes.data?.filter(d => d.assigned_to_admin_id === admin.id && d.status !== 'resolved' && d.status !== 'closed').length || 0,
      total: allDisputes.data?.length || 0,
      open: allDisputes.data?.filter(d => d.status === 'open').length || 0,
      under_review: allDisputes.data?.filter(d => d.status === 'under_review').length || 0,
      resolved: allDisputes.data?.filter(d => d.status === 'resolved').length || 0,
      high_priority: allDisputes.data?.filter(d => d.priority === 'high' || d.priority === 'urgent').length || 0,
    };

    return {
      disputes: disputesWithAdminInfo,
      counts,
      error: null,
    };
  } catch (err) {
    console.error('❌ getAllSellerDisputes Error:', err);
    return {
      disputes: [],
      counts: {
        unassigned: 0,
        my_disputes: 0,
        total: 0,
        open: 0,
        under_review: 0,
        resolved: 0,
        high_priority: 0,
      },
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// Assign dispute to current admin
export async function assignSellerDisputeToMe(disputeId: string) {
  try {
    const { supabase, admin } = await verifyAdmin();

    const { error } = await supabase
      .from('seller_disputes')
      .update({
        assigned_to_admin_id: admin.id,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', disputeId);

    if (error) throw error;

    // Create assignment record
    await supabase.from('seller_dispute_assignments').insert({
      id: crypto.randomUUID(),
      dispute_id: disputeId,
      admin_id: admin.id,
      assigned_by_admin_id: admin.id,
      assigned_at: new Date().toISOString(),
    });

    revalidatePath('/admin/dashboard/seller-disputes');
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to assign dispute',
    };
  }
}

// Unassign dispute
export async function unassignSellerDispute(disputeId: string) {
  try {
    const { supabase } = await verifyAdmin();

    const { error } = await supabase
      .from('seller_disputes')
      .update({
        assigned_to_admin_id: null,
        assigned_at: null,
      })
      .eq('id', disputeId);

    if (error) throw error;

    revalidatePath('/admin/dashboard/seller-disputes');
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to unassign dispute',
    };
  }
}

// Assign dispute to specific admin
export async function assignSellerDisputeToAdmin(disputeId: string, adminId: string) {
  try {
    const { supabase, admin } = await verifyAdmin();

    const { error } = await supabase
      .from('seller_disputes')
      .update({
        assigned_to_admin_id: adminId,
        assigned_at: new Date().toISOString(),
      })
      .eq('id', disputeId);

    if (error) throw error;

    // Create assignment record
    await supabase.from('seller_dispute_assignments').insert({
      id: crypto.randomUUID(),
      dispute_id: disputeId,
      admin_id: adminId,
      assigned_by_admin_id: admin.id,
      assigned_at: new Date().toISOString(),
    });

    revalidatePath('/admin/dashboard/seller-disputes');
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to assign dispute',
    };
  }
}

// Get list of admins for assignment
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

// Get dispute details
export async function getSellerDisputeDetails(disputeId: string) {
  try {
    const { supabase } = await verifyAdmin();

    const { data, error } = await supabase
      .from('seller_disputes')
      .select(`
        *,
        dispute_number,
        assigned_to_admin_id,
        seller:sellers(
          id,
          business_name,
          full_name,
          email,
          state,
          user:profiles!sellers_user_id_fkey(full_name, email)
        ),
        resolved_by:admins!seller_disputes_resolved_by_admin_id_fkey(id, full_name, email, role, admin_number)
      `)
      .eq('id', disputeId)
      .single();

    if (error) throw error;

    // Fetch assigned admin info
    if (data.assigned_to_admin_id) {
      const { data: adminData } = await supabase
        .from('admins')
        .select('id, full_name, email, role, admin_number')
        .eq('id', data.assigned_to_admin_id)
        .single();
      
      if (adminData) {
        data.assigned_to = adminData;
      }
    }

    return { dispute: data, error: null };
  } catch (err) {
    return {
      dispute: null,
      error: err instanceof Error ? err.message : 'Failed to load dispute',
    };
  }
}

// Update dispute status
export async function updateSellerDisputeStatus(disputeId: string, status: string) {
  try {
    const { supabase } = await verifyAdmin();

    const { error } = await supabase
      .from('seller_disputes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', disputeId);

    if (error) throw error;

    revalidatePath('/admin/dashboard/seller-disputes');
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update status',
    };
  }
}

// Update dispute priority
export async function updateSellerDisputePriority(disputeId: string, priority: string) {
  try {
    const { supabase } = await verifyAdmin();

    const { error } = await supabase
      .from('seller_disputes')
      .update({ priority, updated_at: new Date().toISOString() })
      .eq('id', disputeId);

    if (error) throw error;

    revalidatePath('/admin/dashboard/seller-disputes');
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update priority',
    };
  }
}

// Add admin notes
export async function addSellerDisputeAdminNotes(disputeId: string, notes: string) {
  try {
    const { supabase } = await verifyAdmin();

    const { error } = await supabase
      .from('seller_disputes')
      .update({ admin_notes: notes, updated_at: new Date().toISOString() })
      .eq('id', disputeId);

    if (error) throw error;

    revalidatePath('/admin/dashboard/seller-disputes');
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save notes',
    };
  }
}

// Resolve seller dispute
export async function resolveSellerDispute(disputeId: string, resolution: string, adminNotes: string) {
  try {
    const { supabase, admin } = await verifyAdmin();

    const { error } = await supabase
      .from('seller_disputes')
      .update({
        status: 'resolved',
        resolution,
        admin_notes: adminNotes,
        resolved_by_admin_id: admin.id,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId);

    if (error) throw error;

    revalidatePath('/admin/dashboard/seller-disputes');
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to resolve dispute',
    };
  }
}

// Get internal notes for dispute
export async function getSellerDisputeInternalNotes(disputeId: string) {
  try {
    const { supabase } = await verifyAdmin();

    const { data, error } = await supabase
      .from('admin_seller_dispute_notes')
      .select(`
        *,
        admin:admins!admin_seller_dispute_notes_admin_id_fkey(id, full_name, email, admin_number)
      `)
      .eq('dispute_id', disputeId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { notes: data || [], error: null };
  } catch (err) {
    return {
      notes: [],
      error: err instanceof Error ? err.message : 'Failed to load notes',
    };
  }
}

// Add internal note
export async function addSellerDisputeInternalNote(disputeId: string, note: string) {
  try {
    const { supabase, admin } = await verifyAdmin();

    const { error } = await supabase
      .from('admin_seller_dispute_notes')
      .insert({
        id: crypto.randomUUID(),
        dispute_id: disputeId,
        admin_id: admin.id,
        note,
        is_internal: true,
      });

    if (error) throw error;

    revalidatePath('/admin/dashboard/seller-disputes');
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to add note',
    };
  }
}