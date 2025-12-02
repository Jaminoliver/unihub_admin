import { Suspense } from 'react';
import { Shield } from 'lucide-react';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { AdminUserManagement } from '@/components/admin/settings/AdminUserManagement';

export default async function AdminUsersPage() {
  const supabase = createAdminSupabaseClient();

  const { data: admins } = await supabase
    .from('admins')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Admin User Management</h1>
              <p className="text-gray-600 mt-1">Manage admin users and roles</p>
            </div>
          </div>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <AdminUserManagement admins={admins || []} />
        </Suspense>
      </div>
    </div>
  );
}