'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  AlertCircle,
  Wallet,
  Settings,
  FileText,
  TrendingUp,
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Bell,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { 
    name: 'Users', 
    icon: Users,
    children: [
      { name: 'Buyers', href: '/admin/dashboard/users/buyers' },
      { name: 'Sellers', href: '/admin/dashboard/users/sellers' },
    ]
  },
  { 
    name: 'Products', 
    icon: Package,
    children: [
      { name: 'Pending Approval', href: '/admin/dashboard/products/pending', badge: true },
      { name: 'All Products', href: '/admin/dashboard/products/all' },
      { name: 'Categories', href: '/admin/dashboard/products/categories' },
      { name: 'SpecialDeals', href: '/admin/dashboard/products/SpecialDeals' },
      { name: 'Appeals', href: '/admin/dashboard/products/appeals', badge: true },
    ]
  },
  { 
    name: 'Transactions', 
    icon: Wallet,
    children: [
      { name: 'All Transactions', href: '/admin/dashboard/transactions/all' },
      { name: 'Escrow Dashboard', href: '/admin/dashboard/transactions/escrow', badge: true },
      { name: 'Orders', href: '/admin/dashboard/orders' },
    ]
  },
  { name: 'Disputes', href: '/admin/dashboard/disputes', icon: AlertCircle, badge: true },
  { 
    name: 'Notifications',
    icon: Bell,
    children: [
      { name: 'Overview', href: '/admin/dashboard/notifications' },
      { name: 'Compose', href: '/admin/dashboard/notifications/compose' },
      { name: 'Campaigns', href: '/admin/dashboard/notifications/campaigns' },
      { name: 'Templates', href: '/admin/dashboard/notifications/templates' },
      { name: 'Analytics', href: '/admin/dashboard/notifications/analytics' },
    ]
  },
  { 
    name: 'Financials', 
    icon: TrendingUp,
    children: [
      { name: 'Commission Reports', href: '/admin/dashboard/financials/commission' },
      { name: 'Payouts', href: '/admin/dashboard/withdrawals' },
      { name: 'Paystack Logs', href: '/admin/dashboard/financials/paystack' },
      { name: 'Analytics', href: '/admin/dashboard/financials/analytics' },
    ]
  },
  { 
    name: 'Settings', 
    icon: Settings,
    children: [
      { name: 'Admin Users', href: '/admin/dashboard/settings/admins' },
      { name: 'Locations', href: '/admin/dashboard/settings/locations' },
      { name: 'Commission Rules', href: '/admin/dashboard/settings/commission' },
      { name: 'Feature Flags', href: '/admin/dashboard/settings/features' },
      { name: 'Notifications', href: '/admin/dashboard/settings/notifications' },
    ]
  },
  { name: 'Reports', href: '/admin/dashboard/reports', icon: FileText },
  { name: 'Audit Log', href: '/admin/dashboard/audit', icon: ClipboardList },
];

interface AdminSidebarProps {
  session: {
    full_name: string;
    email: string;
    role: string;
  };
}

export function AdminSidebar({ session }: AdminSidebarProps) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<string[]>(['Users', 'Products', 'Transactions', 'Notifications', 'Financials', 'Settings']);

  const toggleSection = (name: string) => {
    setOpenSections(prev =>
      prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
    );
  };

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold">
            U
          </div>
          <span className="font-semibold text-lg">UniHub Admin</span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const hasChildren = 'children' in item && item.children;
          const isOpen = openSections.includes(item.name);
          const isActive = pathname === item.href;

          if (hasChildren) {
            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleSection(item.name)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </div>
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {isOpen && (
                  <div className="ml-8 mt-1 space-y-1">
                    {item.children.map((child) => {
                      const isChildActive = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            'flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                            isChildActive
                              ? 'bg-primary text-white'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          )}
                        >
                          <span>{child.name}</span>
                          {child.badge && (
                            <span className="h-2 w-2 rounded-full bg-red-500"></span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                {item.name}
              </div>
              {item.badge && (
                <span className="h-2 w-2 rounded-full bg-red-500"></span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
            {session?.full_name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{session?.full_name || 'Admin'}</p>
            <p className="text-xs text-gray-400 truncate">{session?.role || 'admin'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}