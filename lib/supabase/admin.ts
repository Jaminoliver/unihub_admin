import { createClient } from '@supabase/supabase-js';

export function createAdminSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  console.log('=========== ADMIN CLIENT DEBUG ===========');
  console.log('📍 URL:', supabaseUrl);
  console.log('🔑 Service Role Key exists:', !!supabaseServiceRoleKey);
  console.log('🔑 Service Role Key length:', supabaseServiceRoleKey?.length);
  console.log('🔑 Service Role Key start:', supabaseServiceRoleKey?.substring(0, 50));
  console.log('🔑 Service Role Key end:', supabaseServiceRoleKey?.substring(supabaseServiceRoleKey.length - 20));
  
  // Decode the JWT to verify it's service_role
  if (supabaseServiceRoleKey) {
    try {
      const payload = JSON.parse(atob(supabaseServiceRoleKey.split('.')[1]));
      console.log('🔓 Decoded JWT role:', payload.role);
      console.log('🔓 Decoded JWT iss:', payload.iss);
      console.log('🔓 Decoded JWT ref:', payload.ref);
    } catch (e) {
      console.error('❌ Failed to decode JWT:', e);
    }
  }
  console.log('==========================================');

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('✅ Admin client created');
  
  return client;
}