import { getAdminSession } from './actions';
import { AdminLoginForm } from '@/components/admin/AdminLoginForm';
import { redirect } from 'next/navigation';

export default async function AdminLoginPage() {
  const session = await getAdminSession();

  if (session) {
    redirect('/admin/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <AdminLoginForm />
    </div>
  );
}