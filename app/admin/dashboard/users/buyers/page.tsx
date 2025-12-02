import { Suspense } from 'react';
import { Users } from 'lucide-react';
import { getAllBuyers, getUniversities, getStates } from '../actions';
import { BuyersTableWrapper } from '@/components/admin/users/BuyersTableWrapper';

export default async function BuyersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    state?: string;
    university?: string;
    accountStatus?: string;
  }>;
}) {
  const params = await searchParams;

  const [buyersData, universitiesData, statesData] = await Promise.all([
    getAllBuyers({
      search: params.search,
      state: params.state,
      universityId: params.university,
      accountStatus: params.accountStatus,
    }),
    getUniversities(),
    getStates(),
  ]);

  const buyers = buyersData.buyers || [];
  const universities = universitiesData.universities || [];
  const states = statesData.states || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Buyers Management</h1>
              <p className="text-gray-600 mt-1">Manage and monitor all buyers</p>
            </div>
          </div>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <BuyersTableWrapper 
            buyers={buyers}
            universities={universities}
            states={states}
          />
        </Suspense>
      </div>
    </div>
  );
}