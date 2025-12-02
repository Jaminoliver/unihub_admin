import { Suspense } from 'react';
import { ClipboardList } from 'lucide-react';
import { AuditLog } from '@/components/admin/audit/AuditLog';

export default async function AuditLogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl">
              <ClipboardList className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Audit Log</h1>
              <p className="text-gray-600 mt-1">System-wide activity tracking</p>
            </div>
          </div>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <AuditLog />
        </Suspense>
      </div>
    </div>
  );
}