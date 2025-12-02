'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function AuditLog() {
  const mockLogs = [
    { id: 1, admin: 'Admin User', action: 'Product Approved', resource: 'Product #12345', timestamp: new Date() },
    { id: 2, admin: 'Admin User', action: 'User Banned', resource: 'User #67890', timestamp: new Date() },
    { id: 3, admin: 'Admin User', action: 'Escrow Released', resource: 'Order #11111', timestamp: new Date() },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockLogs.map((log) => (
            <div key={log.id} className="border-b pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{log.action}</p>
                  <p className="text-sm text-gray-600">{log.resource}</p>
                  <p className="text-xs text-gray-500">by {log.admin}</p>
                </div>
                <p className="text-sm text-gray-500">{log.timestamp.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-gray-500 mt-6">Full audit logging coming soon</p>
      </CardContent>
    </Card>
  );
}