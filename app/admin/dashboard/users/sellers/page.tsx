import { Suspense } from 'react';
import { Store } from 'lucide-react';
import { getAllSellers, getUniversities, getStates } from '../actions';
import { SellersTableWrapper } from '@/components/admin/users/SellersTableWrapper';

export default async function SellersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    state?: string;
    university?: string;
    approvalStatus?: string;
    accountStatus?: string;
  }>;
}) {
  const params = await searchParams;

  const [sellersData, universitiesData, statesData] = await Promise.all([
    getAllSellers({
      search: params.search,
      state: params.state,
      universityId: params.university,
      approvalStatus: params.approvalStatus,
      accountStatus: params.accountStatus,
    }),
    getUniversities(),
    getStates(),
  ]);

  const sellers = sellersData.sellers || [];
  const universities = universitiesData.universities || [];
  const states = statesData.states || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
              <Store className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Sellers Management</h1>
              <p className="text-gray-600 mt-1">Manage and monitor all sellers</p>
            </div>
          </div>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <SellersTableWrapper 
            sellers={sellers}
            universities={universities}
            states={states}
          />
        </Suspense>
      </div>
    </div>
  );
}