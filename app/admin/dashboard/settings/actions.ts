'use server';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function createState(name: string) {
  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from('states')
      .insert({ 
        name, 
        country: 'Nigeria', 
        is_active: true 
      });
    if (error) throw error;
    revalidatePath('/admin/dashboard/settings/locations');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateState(id: string, name: string) {
  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from('states')
      .update({ name })
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/admin/dashboard/settings/locations');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteState(id: string) {
  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from('states')
      .delete()
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/admin/dashboard/settings/locations');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createUniversity(name: string, shortName: string, state: string, city: string) {
  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from('universities')
      .insert({ 
        name, 
        short_name: shortName,
        state, 
        city,
        country: 'Nigeria',
        is_active: true,
        product_count: 0
      });
    if (error) throw error;
    revalidatePath('/admin/dashboard/settings/locations');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateUniversity(id: string, name: string, shortName: string, state: string, city: string) {
  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from('universities')
      .update({ 
        name, 
        short_name: shortName,
        state, 
        city 
      })
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/admin/dashboard/settings/locations');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUniversity(id: string) {
  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from('universities')
      .delete()
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/admin/dashboard/settings/locations');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createAdmin(fullName: string, email: string, password: string, role: string) {
  try {
    const supabase = createAdminSupabaseClient();
    
    // Step 1: Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) throw authError;

    // Step 2: Insert into admins table
    const { error: dbError } = await supabase
      .from('admins')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        role,
        is_active: true,
      });

    // Step 3: ROLLBACK if admin insert fails - delete the auth user
    if (dbError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw dbError;
    }

    revalidatePath('/admin/dashboard/settings/admins');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateAdmin(id: string, fullName: string, role: string) {
  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from('admins')
      .update({ full_name: fullName, role })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/admin/dashboard/settings/admins');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteAdmin(id: string) {
  try {
    const supabase = createAdminSupabaseClient();
    
    // Delete from admins table
    const { error: dbError } = await supabase
      .from('admins')
      .delete()
      .eq('id', id);
    
    if (dbError) throw dbError;

    // Also delete the auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(id);
    if (authError) console.error('Failed to delete auth user:', authError);

    revalidatePath('/admin/dashboard/settings/admins');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}