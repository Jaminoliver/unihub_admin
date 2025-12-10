'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SellerDisputesTable } from './SellerDisputesTable';
import { getAllSellerDisputes } from '@/app/admin/dashboard/seller-disputes/actions';

interface SellerDisputesClientProps {
  adminId: string;
}

export function SellerDisputesClient({ adminId }: SellerDisputesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [counts, setCounts] = useState({
    unassigned: 0,
    my_disputes: 0,
    total: 0,
    open: 0,
    under_review: 0,
    resolved: 0,
    high_priority: 0,
  });
  const [loading, setLoading] = useState(true);

  const activeTab = searchParams.get('tab') || 'unassigned';
  const search = searchParams.get('search') || '';
  const priority = searchParams.get('priority') || '';

  useEffect(() => {
    loadDisputes();
  }, [activeTab, search, priority]);

  const loadDisputes = async () => {
    setLoading(true);
    
    const filters: any = {
      search: search || undefined,
      priority: priority || undefined,
    };

    if (activeTab === 'unassigned') {
      filters.assignmentFilter = 'unassigned';
    } else if (activeTab === 'my_disputes') {
      filters.assignmentFilter = 'my_disputes';
    } else if (activeTab !== 'all') {
      filters.status = activeTab;
    }

    const result = await getAllSellerDisputes(filters);
    setDisputes(result.disputes);
    setCounts(result.counts);
    setLoading(false);
  };

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Seller Disputes</h1>
          <p className="text-gray-600 mt-1">
            Manage seller complaints against platform actions and policies
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 bg-orange-50 border-orange-200">
            <p className="text-sm text-orange-700 font-medium">Unassigned</p>
            <p className="text-3xl font-bold text-orange-600 mt-1">{counts.unassigned}</p>
          </Card>
          <Card className="p-4 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-700 font-medium">My Disputes</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{counts.my_disputes}</p>
          </Card>
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <p className="text-sm text-yellow-700 font-medium">Open</p>
            <p className="text-3xl font-bold text-yellow-600 mt-1">{counts.open}</p>
          </Card>
          <Card className="p-4 bg-red-50 border-red-200">
            <p className="text-sm text-red-700 font-medium">High Priority</p>
            <p className="text-3xl font-bold text-red-600 mt-1">{counts.high_priority}</p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="unassigned">
              Unassigned Queue ({counts.unassigned})
            </TabsTrigger>
            <TabsTrigger value="my_disputes">
              My Disputes ({counts.my_disputes})
            </TabsTrigger>
            <TabsTrigger value="open">
              Open ({counts.open})
            </TabsTrigger>
            <TabsTrigger value="under_review">
              Under Review ({counts.under_review})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved ({counts.resolved})
            </TabsTrigger>
          </TabsList>

          {['unassigned', 'my_disputes', 'open', 'under_review', 'resolved'].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <SellerDisputesTable
                disputes={disputes}
                adminId={adminId}
                onAssignmentChange={loadDisputes}
                filters={{ search, priority }}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}