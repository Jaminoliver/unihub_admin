import { Suspense } from 'react';
import { AlertCircle, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { DisputesTable } from '@/components/admin/disputes/DisputesTable';
import { getAllDisputes } from './actions';

const TABS = [
  { id: 'all', label: 'All Disputes', icon: AlertCircle, color: 'from-blue-500 to-indigo-500', bgColor: 'bg-blue-50', textColor: 'text-blue-600' },
  { id: 'open', label: 'Open', icon: AlertTriangle, color: 'from-orange-500 to-red-500', bgColor: 'bg-orange-50', textColor: 'text-orange-600' },
  { id: 'under_review', label: 'Under Review', icon: Clock, color: 'from-yellow-500 to-amber-500', bgColor: 'bg-yellow-50', textColor: 'text-yellow-600' },
  { id: 'resolved', label: 'Resolved', icon: CheckCircle, color: 'from-green-500 to-emerald-500', bgColor: 'bg-green-50', textColor: 'text-green-600' },
];

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
            <p className="text-xl font-bold text-gray-900 break-words">{value}</p>
          </div>
          <div className={`p-3 bg-gradient-to-br ${gradient} rounded-xl flex-shrink-0`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

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

export default async function DisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; status?: string; priority?: string; raisedBy?: string; }>;
}) {
  const params = await searchParams;
  const activeTab = params.tab || 'all';
  const statusFilter = activeTab === 'all' ? undefined : activeTab;

  // 1. Fetch data (now returns { disputes, counts })
  const { disputes, counts } = await getAllDisputes({
    search: params.search,
    status: statusFilter,
    priority: params.priority,
    raisedBy: params.raisedBy,
  });

  // 2. Use the DB counts directly (DELETE the old manual filter calculations)
  const totalDisputes = counts.total;
  const openDisputes = counts.open;
  const underReviewDisputes = counts.under_review;
  const resolvedDisputes = counts.resolved;
  const highPriorityDisputes = counts.high_priority;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-red-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl">
              <AlertCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Dispute Resolution Center</h1>
              <p className="text-gray-600 mt-1">Manage and resolve order disputes</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 mb-8">
          {/* Top Row - 4 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <DashboardCard 
              label="Total Disputes" 
              value={totalDisputes.toLocaleString()} 
              icon={AlertCircle} 
              gradient="from-blue-500 to-indigo-600" 
            />
            <DashboardCard 
              label="Open" 
              value={openDisputes.toLocaleString()} 
              icon={AlertTriangle} 
              gradient="from-orange-500 to-red-600" 
            />
            <DashboardCard 
              label="Under Review" 
              value={underReviewDisputes.toLocaleString()} 
              icon={Clock} 
              gradient="from-yellow-500 to-amber-600" 
            />
            <DashboardCard 
              label="High Priority" 
              value={highPriorityDisputes.toLocaleString()} 
              icon={AlertTriangle} 
              gradient="from-red-600 to-rose-700" 
            />
          </div>
        </div>

       <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4">
            {TABS.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count =
                tab.id === 'all' ? totalDisputes :
                tab.id === 'open' ? openDisputes :
                tab.id === 'under_review' ? underReviewDisputes :
                resolvedDisputes;

              const linkClass = `relative p-6 flex items-center gap-4 transition-all duration-300 group ${
                index < TABS.length - 1 ? 'border-r border-gray-200' : ''
              } ${isActive ? tab.bgColor : 'hover:bg-gray-50'}`;

              const iconWrapperClass = `p-3 rounded-xl transition-all duration-300 ${
                isActive ? 'bg-gradient-to-br ' + tab.color : 'bg-gray-100 group-hover:bg-gray-200'
              }`;

              const iconClass = `h-6 w-6 ${isActive ? 'text-white' : 'text-gray-600'}`;

              const labelClass = `font-semibold ${isActive ? tab.textColor : 'text-gray-700'}`;

              const badgeClass = `px-2 py-0.5 rounded-full text-xs font-bold ${
                isActive ? tab.bgColor + ' ' + tab.textColor : 'bg-gray-200 text-gray-700'
              }`;

              return (
                <a key={tab.id} href={`?tab=${tab.id}`} className={linkClass}>
                  {isActive && (
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tab.color}`} />
                  )}
                  <div className={iconWrapperClass}>
                    <Icon className={iconClass} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={labelClass}>{tab.label}</p>
                      {count > 0 && <span className={badgeClass}>{count}</span>}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
        
        <Suspense fallback={<LoadingState />}>
          <DisputesTable 
            disputes={disputes} 
            filters={{
              search: params.search,
              status: params.status,
              priority: params.priority,
              raisedBy: params.raisedBy,
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}