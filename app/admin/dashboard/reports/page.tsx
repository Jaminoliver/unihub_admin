import { Suspense } from 'react';
import { FileText } from 'lucide-react';
import { ReportsCenter } from '@/components/admin/reports/ReportsCenter';

export default async function ReportsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Reports Center</h1>
              <p className="text-gray-600 mt-1">Generate and export platform reports</p>
            </div>
          </div>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <ReportsCenter />
        </Suspense>
      </div>
    </div>
  );
}