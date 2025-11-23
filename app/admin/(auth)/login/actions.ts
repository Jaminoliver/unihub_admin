'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function adminLogin(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password required' };
  }

  const supabase = await createServerSupabaseClient();

  // Sign in with Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { error: 'Invalid email or password' };
  }

  // Verify user is an admin
  const { data: admin, error: adminError } = await supabase
    .from('admins')
    .select('id, email, role, full_name, is_active')
    .eq('email', email)
    .single();

  if (adminError || !admin || !admin.is_active) {
    await supabase.auth.signOut();
    return { error: 'Admin access required' };
  }

  // Update last login
  await supabase
    .from('admins')
    .update({ last_login: new Date().toISOString() })
    .eq('email', email);

  // Set admin session cookie
  const cookieStore = await cookies();
  cookieStore.set('admin_session', JSON.stringify({
    id: admin.id,
    email: admin.email,
    role: admin.role,
    full_name: admin.full_name
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7
  });

  redirect('/admin/dashboard');
}

export async function getAdminSession() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get('admin_session');
    
    if (!session) return null;
    
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}