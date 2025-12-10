import { redirect } from 'next/navigation';
import { getAdminSession } from '@/app/admin/(auth)/login/actions';
import { hasPermission, type AdminRole, type Permission } from './permissions';

// Server-side permission check
export async function requirePermission(permission: Permission) {
  const session = await getAdminSession();
  
  if (!session) {
    redirect('/admin/login');
  }

  const userRole = session.role as AdminRole;
  
  if (!hasPermission(userRole, permission)) {
    redirect('/admin/dashboard?error=unauthorized');
  }

  return session;
}

// Check multiple permissions (user needs at least one)
export async function requireAnyPermission(permissions: Permission[]) {
  const session = await getAdminSession();
  
  if (!session) {
    redirect('/admin/login');
  }

  const userRole = session.role as AdminRole;
  const hasAccess = permissions.some(p => hasPermission(userRole, p));
  
  if (!hasAccess) {
    redirect('/admin/dashboard?error=unauthorized');
  }

  return session;
}

// Check if current user has permission (doesn't redirect)
export async function checkPermission(permission: Permission): Promise<boolean> {
  const session = await getAdminSession();
  if (!session) return false;
  
  const userRole = session.role as AdminRole;
  return hasPermission(userRole, permission);
}