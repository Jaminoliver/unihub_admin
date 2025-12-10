import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SellerDisputesClient } from '@/components/admin/seller-disputes/SellerDisputesClient';

export default async function AdminSellerDisputesPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/admin/login');
  }

  // Check if user is admin
  const { data: admin } = await supabase
    .from('admins')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!admin) {
    redirect('/admin/login');
  }

  return <SellerDisputesClient adminId={admin.id} />;
}