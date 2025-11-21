'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { WithdrawalProcessor } from './WithdrawalProcessor';
import { PayoutHistory } from './PayoutHistory';

interface WithdrawalTabsProps {
  pendingWithdrawals: any[];
  completedWithdrawals: any[];
  failedWithdrawals: any[];
}

export function WithdrawalTabs({ 
  pendingWithdrawals, 
  completedWithdrawals,
  failedWithdrawals 
}: WithdrawalTabsProps) {
  return (
    <Tabs defaultValue="pending" className="w-full">
      <TabsList className="grid w-full max-w-2xl grid-cols-3">
        <TabsTrigger value="pending" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Pending ({pendingWithdrawals.length})
        </TabsTrigger>
        <TabsTrigger value="completed" className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Completed ({completedWithdrawals.length})
        </TabsTrigger>
        <TabsTrigger value="failed" className="flex items-center gap-2">
          <XCircle className="h-4 w-4" />
          Failed ({failedWithdrawals.length})
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="pending" className="mt-6">
        <WithdrawalProcessor withdrawals={pendingWithdrawals} />
      </TabsContent>
      
      <TabsContent value="completed" className="mt-6">
        <PayoutHistory withdrawals={completedWithdrawals} status="completed" />
      </TabsContent>
      
      <TabsContent value="failed" className="mt-6">
        <PayoutHistory withdrawals={failedWithdrawals} status="failed" />
      </TabsContent>
    </Tabs>
  );
}