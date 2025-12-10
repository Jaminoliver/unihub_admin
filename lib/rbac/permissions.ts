// Role definitions
export type AdminRole = 'super_admin' | 'moderator' | 'support' | 'financial_admin';

// Permission categories
export type Permission = 
  // Dashboard
  | 'view_dashboard'
  
  // Users
  | 'view_users'
  | 'edit_users'
  | 'suspend_users'
  | 'ban_users'
  
  // Products
  | 'view_products'
  | 'approve_products'
  | 'reject_products'
  | 'edit_products'
  | 'delete_products'
  | 'manage_categories'
  | 'handle_appeals'
  | 'manage_special_deals' // ✅ NEW: For pricing/promotions
  
  // Transactions
  | 'view_transactions'
  | 'view_escrow'
  | 'override_escrow'
  | 'view_orders'
  
  // Disputes
  | 'view_disputes'
  | 'resolve_disputes'
  
  // Financials
  | 'view_financials'
  | 'view_commission'
  | 'process_payouts'
  | 'view_paystack_logs'
  | 'view_analytics'
  
  // Notifications
  | 'view_notifications'
  | 'send_notifications'
  | 'manage_campaigns'
  | 'manage_templates'
  
  // Settings
  | 'manage_admins'
  | 'manage_locations'
  | 'manage_commission_rules'
  | 'manage_feature_flags'
  | 'manage_system_settings'
  
  // Reports & Audit
  | 'view_reports'
  | 'view_audit_log';

// Role-based permissions map
const rolePermissions: Record<AdminRole, Permission[]> = {
  super_admin: [
    // Full access to everything
    'view_dashboard',
    'view_users', 'edit_users', 'suspend_users', 'ban_users',
    'view_products', 'approve_products', 'reject_products', 'edit_products', 'delete_products', 'manage_categories', 'handle_appeals', 'manage_special_deals',
    'view_transactions', 'view_escrow', 'override_escrow', 'view_orders',
    'view_disputes', 'resolve_disputes',
    'view_financials', 'view_commission', 'process_payouts', 'view_paystack_logs', 'view_analytics',
    'view_notifications', 'send_notifications', 'manage_campaigns', 'manage_templates',
    'manage_admins', 'manage_locations', 'manage_commission_rules', 'manage_feature_flags', 'manage_system_settings',
    'view_reports', 'view_audit_log',
  ],
  
  moderator: [
    // ✅ FINAL: Product & user management, can view escrow, NO special deals (pricing decisions)
    'view_dashboard',
    'view_users', 'edit_users', 'suspend_users',
    'view_products', 'approve_products', 'reject_products', 'edit_products', 'manage_categories', 'handle_appeals',
    // ❌ NO manage_special_deals - pricing is executive/finance decision
    'view_transactions', 'view_escrow', 'view_orders',
    'view_disputes', 'resolve_disputes',
    'view_reports',
  ],
  
  support: [
    // ✅ FINAL: View-only + disputes, no notifications
    'view_dashboard',
    'view_users',
    'view_products',
    'view_transactions', 'view_orders',
    'view_disputes', 'resolve_disputes',
  ],
  
  financial_admin: [
    // ✅ FINAL: Full financial access + special deals (pricing), reports, orders
    'view_dashboard',
    'view_users',
    'view_products',
    'manage_special_deals', // ✅ ADDED: Finance manages pricing/promotions
    'view_transactions', 'view_escrow', 'override_escrow', 'view_orders',
    'view_financials', 'view_commission', 'process_payouts', 'view_paystack_logs', 'view_analytics',
    'view_reports', 'view_audit_log',
  ],
};

// Check if role has permission
export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

// Check if role has any of the permissions
export function hasAnyPermission(role: AdminRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

// Check if role has all permissions
export function hasAllPermissions(role: AdminRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

// Get all permissions for a role
export function getRolePermissions(role: AdminRole): Permission[] {
  return rolePermissions[role] ?? [];
}

// Navigation items with required permissions
export const navigationPermissions: Record<string, Permission[]> = {
  '/admin/dashboard': ['view_dashboard'],
  '/admin/dashboard/users/buyers': ['view_users'],
  '/admin/dashboard/users/sellers': ['view_users'],
  '/admin/dashboard/products/pending': ['view_products', 'approve_products'],
  '/admin/dashboard/products/all': ['view_products'],
  '/admin/dashboard/products/categories': ['view_products', 'manage_categories'],
  '/admin/dashboard/products/SpecialDeals': ['manage_special_deals'], // ✅ CHANGED: Now requires manage_special_deals
  '/admin/dashboard/products/appeals': ['view_products', 'handle_appeals'],
  '/admin/dashboard/transactions/all': ['view_transactions'],
  '/admin/dashboard/transactions/escrow': ['view_escrow'],
  '/admin/dashboard/orders': ['view_orders'],
  '/admin/dashboard/disputes': ['view_disputes'],
  '/admin/dashboard/notifications': ['view_notifications'],
  '/admin/dashboard/notifications/compose': ['send_notifications'],
  '/admin/dashboard/notifications/campaigns': ['manage_campaigns'],
  '/admin/dashboard/notifications/templates': ['manage_templates'],
  '/admin/dashboard/notifications/analytics': ['view_notifications'],
  '/admin/dashboard/financials/commission': ['view_commission'],
  '/admin/dashboard/withdrawals': ['process_payouts'],
  '/admin/dashboard/financials/paystack': ['view_paystack_logs'],
  '/admin/dashboard/financials/analytics': ['view_analytics'],
  '/admin/dashboard/settings/admins': ['manage_admins'],
  '/admin/dashboard/settings/locations': ['manage_locations'],
  '/admin/dashboard/settings/commission': ['manage_commission_rules'],
  '/admin/dashboard/settings/features': ['manage_feature_flags'],
  '/admin/dashboard/settings/notifications': ['manage_system_settings'],
  '/admin/dashboard/reports': ['view_reports'],
  '/admin/dashboard/audit': ['view_audit_log'],
};

// Check if user can access route
export function canAccessRoute(role: AdminRole, route: string): boolean {
  const requiredPermissions = navigationPermissions[route];
  if (!requiredPermissions || requiredPermissions.length === 0) return true;
  return hasAnyPermission(role, requiredPermissions);
}