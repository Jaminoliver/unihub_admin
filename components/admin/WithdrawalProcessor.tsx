'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useState } from 'react';
import { processWithdrawal, processAllWithdrawals } from '@/app/admin/dashboard/withdrawals/actions';

interface Withdrawal {
  id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  created_at: string;
  seller: {
    full_name: string;
    email: string;
    wallet_balance: number;
  };
}

interface WithdrawalProcessorProps {
  withdrawals: Withdrawal[];
}

export function WithdrawalProcessor({ withdrawals }: WithdrawalProcessorProps) {
  const [processing, setProcessing] = useState<string | null>(null);
  const [processingAll, setProcessingAll] = useState(false);

  const handleProcessWithdrawal = async (withdrawalId: string) => {
    setProcessing(withdrawalId);

    try {
      const result = await processWithdrawal(withdrawalId);

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process withdrawal');
    } finally {
      setProcessing(null);
    }
  };

  const handleProcessAll = async () => {
    setProcessingAll(true);

    try {
      const withdrawalIds = withdrawals.map(w => w.id);
      const result = await processAllWithdrawals(withdrawalIds);

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.warning(result.message);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to process withdrawals');
    } finally {
      setProcessingAll(false);
    }
  };

  if (withdrawals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Withdrawals</CardTitle>
          <CardDescription>No pending withdrawal requests</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">All caught up! 🎉</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Pending Withdrawals</CardTitle>
            <CardDescription>{withdrawals.length} requests waiting for processing</CardDescription>
          </div>
          <Button 
            onClick={handleProcessAll} 
            disabled={processingAll || !!processing}
          >
            {processingAll ? 'Processing All...' : 'Process All'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {withdrawals.map((withdrawal) => (
            <div key={withdrawal.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{withdrawal.seller.full_name}</p>
                  <Badge variant="secondary">{withdrawal.seller.email}</Badge>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  ₦{withdrawal.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500">
                  {withdrawal.bank_name} • {withdrawal.account_number} • {withdrawal.account_name}
                </p>
                <p className="text-xs text-gray-400">
                  Wallet Balance: ₦{withdrawal.seller.wallet_balance.toLocaleString('en-NG')}
                </p>
                <p className="text-xs text-gray-400">
                  Requested: {new Date(withdrawal.created_at).toLocaleString('en-NG')}
                </p>
              </div>

              <Button
                onClick={() => handleProcessWithdrawal(withdrawal.id)}
                disabled={processing === withdrawal.id || processingAll}
              >
                {processing === withdrawal.id ? 'Processing...' : 'Process'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}