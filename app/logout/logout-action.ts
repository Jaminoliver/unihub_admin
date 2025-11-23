// File: app/admin/logout-action.ts
'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function logoutAdmin() {
  try {
    // Create Supabase client
    const supabase = await createServerSupabaseClient();
    
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Delete admin session cookie
    const cookieStore = await cookies();
    cookieStore.delete('admin_session');
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Logout error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to logout' 
    };
  }
}