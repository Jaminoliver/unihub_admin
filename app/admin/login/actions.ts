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

  const { data: admin, error } = await supabase
    .rpc('verify_admin_login', {
      admin_email: email,
      admin_password: password
    });

  if (error || !admin) {
    return { error: 'Invalid email or password' };
  }

  await supabase
    .from('admins')
    .update({ last_login: new Date().toISOString() })
    .eq('email', email);

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
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  
  if (!session) return null;
  
  try {
    return JSON.parse(session.value);
  } catch {
    return null;
  }
}