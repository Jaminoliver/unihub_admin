import { Suspense } from 'react';
import { Users, UserCheck, Store, AlertCircle } from 'lucide-react';
import { UsersContent } from '@/components/admin/users/UsersContent';
import { getAllBuyers, getAllSellers, getPendingSellers, getUniversities, getStates } from './actions';

function LoadingState() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-1/3"></div>
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface DashboardCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}

function DashboardCard({ label, value, icon: Icon, gradient }: DashboardCardProps) {
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full -mr-16 -mt-16`} />
      <div className="relative p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-3">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`p-3 bg-gradient-to-br ${gradient} rounded-xl flex-shrink-0`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    search?: string;
    state?: string;
    university?: string;
    approvalStatus?: string;
    accountStatus?: string;
  }>;
}) {
  const params = await searchParams;
  const activeTab = params.tab || 'sellers';

  const [buyersData, sellersData, pendingSellersData, universitiesData, statesData] = await Promise.all([
    getAllBuyers({
      search: params.search,
      state: params.state,
      universityId: params.university,
      accountStatus: params.accountStatus,
    }),
    getAllSellers({
      search: params.search,
      state: params.state,
      universityId: params.university,
      approvalStatus: params.approvalStatus,
      accountStatus: params.accountStatus,
    }),
    getPendingSellers(),
    getUniversities(),
    getStates(),
  ]);

  const buyers = buyersData.buyers || [];
  const sellers = sellersData.sellers || [];
  const pendingSellers = pendingSellersData.sellers || [];
  const universities = universitiesData.universities || [];
  const states = statesData.states || [];

  const totalBuyers = buyers.length;
  const totalSellers = sellers.length;
  const pendingSellersCount = pendingSellers.length;
  const approvedSellers = sellers.filter(s => s.approval_status === 'approved').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Users Management</h1>
              <p className="text-gray-600 mt-1">Manage buyers, sellers, and account approvals</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <DashboardCard 
            label="Total Buyers" 
            value={totalBuyers.toLocaleString()} 
            icon={Users} 
            gradient="from-blue-500 to-indigo-600" 
          />
          <DashboardCard 
            label="Total Sellers" 
            value={totalSellers.toLocaleString()} 
            icon={Store} 
            gradient="from-purple-500 to-pink-600" 
          />
          <DashboardCard 
            label="Pending Approval" 
            value={pendingSellersCount.toLocaleString()} 
            icon={AlertCircle} 
            gradient="from-orange-500 to-red-600" 
          />
          <DashboardCard 
            label="Approved Sellers" 
            value={approvedSellers.toLocaleString()} 
            icon={UserCheck} 
            gradient="from-green-500 to-emerald-600" 
          />
        </div>

        {pendingSellers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-orange-500" />
                Quick Approval - Pending Sellers ({pendingSellers.length})
              </h2>
            </div>
            <UsersContent 
              buyers={buyers}
              sellers={sellers}
              pendingSellers={pendingSellers}
              universities={universities}
              states={states}
              activeTab="quick-approval"
            />
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
          <div className="grid grid-cols-2">
            {[
              { id: 'sellers', label: 'Sellers', icon: Store, count: totalSellers },
              { id: 'buyers', label: 'Buyers', icon: Users, count: totalBuyers },
            ].map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              const linkClass = `relative p-6 flex items-center gap-4 transition-all duration-300 group ${
                index === 0 ? 'border-r border-gray-200' : ''
              } ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`;

              const iconWrapperClass = `p-3 rounded-xl transition-all duration-300 ${
                isActive ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gray-100 group-hover:bg-gray-200'
              }`;

              const iconClass = `h-6 w-6 ${isActive ? 'text-white' : 'text-gray-600'}`;
              const labelClass = `font-semibold ${isActive ? 'text-blue-600' : 'text-gray-700'}`;
              const badgeClass = `px-2 py-0.5 rounded-full text-xs font-bold ${
                isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-700'
              }`;

              return (
                <a key={tab.id} href={`?tab=${tab.id}`} className={linkClass}>
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
                  )}
                  <div className={iconWrapperClass}>
                    <Icon className={iconClass} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={labelClass}>{tab.label}</p>
                      <span className={badgeClass}>{tab.count}</span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        <Suspense fallback={<LoadingState />}>
          <UsersContent 
            buyers={buyers}
            sellers={sellers}
            pendingSellers={pendingSellers}
            universities={universities}
            states={states}
            activeTab={activeTab}
          />
        </Suspense>
      </div>
    </div>
  );
}