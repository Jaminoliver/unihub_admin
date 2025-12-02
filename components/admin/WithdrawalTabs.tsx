'use client';

import { useState } from 'react';
import { Clock, CheckCircle, XCircle, Ban, AlertTriangle } from 'lucide-react';
import { WithdrawalProcessor } from './WithdrawalProcessor';
import { PayoutHistory } from './PayoutHistory';

interface WithdrawalTabsProps {
  pendingWithdrawals: any[];
  completedWithdrawals: any[];
  failedWithdrawals: any[];
  rejectedWithdrawals: any[];
}

export function WithdrawalTabs({ 
  pendingWithdrawals, 
  completedWithdrawals, 
  failedWithdrawals,
  rejectedWithdrawals 
}: WithdrawalTabsProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'on_hold' | 'completed' | 'failed' | 'rejected'>('pending');

  // Filter out on_hold from pending
  const truePending = pendingWithdrawals.filter(w => w.status === 'pending');
  const onHoldWithdrawals = pendingWithdrawals.filter(w => w.status === 'on_hold');

  const tabs = [
    { 
      id: 'pending' as const, 
      label: 'Pending', 
      icon: Clock, 
      count: truePending.length,
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200'
    },
    { 
      id: 'on_hold' as const, 
      label: 'On Hold', 
      icon: AlertTriangle, 
      count: onHoldWithdrawals.length,
      color: 'text-orange-600 bg-orange-50 border-orange-200'
    },
    { 
      id: 'completed' as const, 
      label: 'Completed', 
      icon: CheckCircle, 
      count: completedWithdrawals.length,
      color: 'text-green-600 bg-green-50 border-green-200'
    },
    { 
      id: 'failed' as const, 
      label: 'Failed', 
      icon: XCircle, 
      count: failedWithdrawals.length,
      color: 'text-red-600 bg-red-50 border-red-200'
    },
    { 
      id: 'rejected' as const, 
      label: 'Rejected', 
      icon: Ban, 
      count: rejectedWithdrawals.length,
      color: 'text-gray-600 bg-gray-50 border-gray-200'
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      {/* Tab Headers */}
      <div className="border-b bg-gray-50">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-4 font-medium transition-all
                  ${isActive 
                    ? 'border-b-2 border-blue-600 text-blue-600 bg-white' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
                <span className={`
                  px-2 py-0.5 rounded-full text-sm font-semibold
                  ${isActive ? tab.color : 'bg-gray-200 text-gray-600'}
                `}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'pending' && (
          <WithdrawalProcessor withdrawals={truePending} />
        )}

        {activeTab === 'on_hold' && (
          <div>
            <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-orange-900">Withdrawals On Hold</h3>
                  <p className="text-sm text-orange-700 mt-1">
                    These withdrawals have been put on hold for review. They can be resumed or rejected from here.
                  </p>
                </div>
              </div>
            </div>
            <WithdrawalProcessor withdrawals={onHoldWithdrawals} />
          </div>
        )}

        {activeTab === 'completed' && (
          <PayoutHistory withdrawals={completedWithdrawals} status="completed" />
        )}

        {activeTab === 'failed' && (
          <PayoutHistory withdrawals={failedWithdrawals} status="failed" />
        )}

        {activeTab === 'rejected' && (
          <PayoutHistory withdrawals={rejectedWithdrawals} status="rejected" />
        )}
      </div>
    </div>
  );
}