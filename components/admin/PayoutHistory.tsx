'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, User, Calendar, CreditCard, CheckCircle, XCircle, Wallet } from 'lucide-react';

interface PayoutHistoryProps {
  withdrawals: any[];
  status: 'completed' | 'failed';
}

export function PayoutHistory({ withdrawals, status }: PayoutHistoryProps) {
  if (withdrawals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {status === 'completed' ? 'Payout History' : 'Failed Withdrawals'}
          </CardTitle>
          <CardDescription>
            {status === 'completed' 
              ? 'Successfully processed withdrawal requests' 
              : 'Withdrawal requests that failed to process'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500">No {status} withdrawals</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {status === 'completed' ? 'Payout History' : 'Failed Withdrawals'}
        </CardTitle>
        <CardDescription>
          {withdrawals.length} {status} withdrawal{withdrawals.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {withdrawals.map((withdrawal) => {
            const seller = Array.isArray(withdrawal.seller) ? withdrawal.seller[0] : withdrawal.seller;
            const profile = seller?.profiles?.[0] || seller?.profiles;
            
            return (
              <div 
                key={withdrawal.id} 
                className="border rounded-lg p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`rounded-full p-3 ${
                      status === 'completed' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {status === 'completed' ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {seller?.business_name || 'Unknown Seller'}
                        </h3>
                        <Badge variant={status === 'completed' ? 'default' : 'destructive'}>
                          {status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="h-4 w-4" />
                          <span>{profile?.full_name || 'N/A'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Building2 className="h-4 w-4" />
                          <span>{withdrawal.bank_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <CreditCard className="h-4 w-4" />
                          <span>{withdrawal.account_number}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {new Date(status === 'completed' ? withdrawal.processed_at : withdrawal.created_at).toLocaleDateString('en-NG', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      {withdrawal.failure_reason && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                          <p className="text-sm text-red-800">
                            <strong>Failure Reason:</strong> {withdrawal.failure_reason}
                          </p>
                        </div>
                      )}

                      {withdrawal.paystack_transfer_code && (
                        <div className="mt-3 text-xs text-gray-500">
                          Transfer Code: {withdrawal.paystack_transfer_code}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <p className={`text-2xl font-bold ${
                      status === 'completed' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      ₦{parseFloat(withdrawal.amount).toLocaleString('en-NG', {
                        minimumFractionDigits: 2
                      })}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {withdrawal.account_name}
                    </p>
                  </div>
                </div>

                {status === 'completed' && (
                  <div className="pt-3 border-t border-gray-200 text-xs text-gray-500">
                    Requested: {new Date(withdrawal.created_at).toLocaleDateString('en-NG', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {' • '}
                    Processed: {new Date(withdrawal.processed_at).toLocaleDateString('en-NG', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}