'use client';

import { useRouter } from 'next/navigation';
import { hasPermission, type AdminRole, type Permission } from '@/lib/rbac/permissions';
import { ReactNode } from 'react';

interface PermissionGateProps {
  children: ReactNode;
  permission: Permission | Permission[];
  role: AdminRole;
  fallback?: ReactNode;
  requireAll?: boolean; // If true, require all permissions. If false, require any one permission
}

export function PermissionGate({ 
  children, 
  permission, 
  role, 
  fallback = null,
  requireAll = false 
}: PermissionGateProps) {
  const permissions = Array.isArray(permission) ? permission : [permission];
  
  const hasAccess = requireAll
    ? permissions.every(p => hasPermission(role, p))
    : permissions.some(p => hasPermission(role, p));

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Button wrapper that disables/hides based on permission
interface PermissionButtonProps {
  children: ReactNode;
  permission: Permission | Permission[];
  role: AdminRole;
  hideIfNoAccess?: boolean; // If true, hide button. If false, disable it
  requireAll?: boolean;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function PermissionButton({
  children,
  permission,
  role,
  hideIfNoAccess = false,
  requireAll = false,
  onClick,
  className = '',
  disabled = false,
}: PermissionButtonProps) {
  const permissions = Array.isArray(permission) ? permission : [permission];
  
  const hasAccess = requireAll
    ? permissions.every(p => hasPermission(role, p))
    : permissions.some(p => hasPermission(role, p));

  if (!hasAccess && hideIfNoAccess) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || !hasAccess}
      className={className}
      title={!hasAccess ? 'You do not have permission for this action' : undefined}
    >
      {children}
    </button>
  );
}