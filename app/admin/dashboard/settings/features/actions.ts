'use server';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getAdminSession } from '@/app/admin/(auth)/login/actions';

export async function getFeatureFlags() {
  try {
    const supabase = createAdminSupabaseClient();
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('flag_name', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message, data: [] };
  }
}

export async function toggleFeatureFlag(flagId: string, isEnabled: boolean) {
  try {
    const session = await getAdminSession();
    if (!session) throw new Error('Unauthorized');

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from('feature_flags')
      .update({ 
        is_enabled: isEnabled,
        updated_by: session.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', flagId);

    if (error) throw error;

    revalidatePath('/admin/dashboard/settings/features');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateFeatureFlag(
  flagId: string, 
  flagName: string, 
  description: string
) {
  try {
    const session = await getAdminSession();
    if (!session) throw new Error('Unauthorized');

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from('feature_flags')
      .update({ 
        flag_name: flagName,
        description,
        updated_by: session.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', flagId);

    if (error) throw error;

    revalidatePath('/admin/dashboard/settings/features');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createFeatureFlag(
  flagKey: string,
  flagName: string,
  description: string,
  isEnabled: boolean = false
) {
  try {
    const session = await getAdminSession();
    if (!session) throw new Error('Unauthorized');

    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from('feature_flags')
      .insert({
        flag_key: flagKey,
        flag_name: flagName,
        description,
        is_enabled: isEnabled,
        updated_by: session.id
      });

    if (error) throw error;

    revalidatePath('/admin/dashboard/settings/features');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteFeatureFlag(flagId: string) {
  try {
    const supabase = createAdminSupabaseClient();
    const { error } = await supabase
      .from('feature_flags')
      .delete()
      .eq('id', flagId);

    if (error) throw error;

    revalidatePath('/admin/dashboard/settings/features');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}