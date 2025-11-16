'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Package, Wallet, AlertCircle } from 'lucide-react';

interface QuickActionsProps {
  stats: {
    pendingProducts: number;
    pendingWithdrawals: number;
  };
}

export function QuickActions({ stats }: QuickActionsProps) {
  const router = useRouter();

  const actions = [
    {
      title: 'Product Approvals',
      description: `${stats.pendingProducts} products awaiting review`,
      icon: Package,
      action: () => router.push('/admin/products'),
      color: 'bg-yellow-500 hover:bg-yellow-600',
      disabled: stats.pendingProducts === 0,
    },
    {
      title: 'Process Withdrawals',
      description: `${stats.pendingWithdrawals} pending withdrawal requests`,
      icon: Wallet,
      action: () => router.push('/admin/withdrawals'),
      color: 'bg-green-500 hover:bg-green-600',
      disabled: stats.pendingWithdrawals === 0,
    },
    {
      title: 'Resolve Disputes',
      description: 'View open dispute cases',
      icon: AlertCircle,
      action: () => router.push('/admin/disputes'),
      color: 'bg-red-500 hover:bg-red-600',
      disabled: true, // Will enable when disputes exist
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Jump to common admin tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {actions.map((action) => (
            <Button
              key={action.title}
              onClick={action.action}
              disabled={action.disabled}
              className={`h-auto flex-col items-start p-4 ${action.color} text-white`}
              variant="default"
            >
              <div className="flex items-center gap-2 mb-2">
                <action.icon className="h-5 w-5" />
                <span className="font-semibold">{action.title}</span>
              </div>
              <p className="text-sm opacity-90 text-left">{action.description}</p>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}