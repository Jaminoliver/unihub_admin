// FILE: app/admin/dashboard/products/page.tsx
import { Suspense } from 'react';
import { LayoutDashboard, Package, Clock, FolderOpen, Users, MessageSquare } from 'lucide-react';
import { ApprovalQueue } from '@/components/admin/products/ApprovalQueue';
import { AllProducts } from '@/components/admin/products/AllProducts';
import { CategoryManager } from '@/components/admin/products/CategoryManager';
import { AppealsManager } from '@/components/admin/products/AppealManager';
import {
  getApprovalQueue,
  getAllProducts,
  getCategories,
  getSellers,
  getAppeals,
} from './actions';

const TABS = [
  {
    id: 'approval',
    label: 'Approval Queue',
    icon: Clock,
    description: 'Review pending submissions',
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-600',
  },
  {
    id: 'appeals',
    label: 'Appeals',
    icon: MessageSquare,
    description: 'Review suspension appeals',
    color: 'from-pink-500 to-rose-500',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-600',
  },
  {
    id: 'all',
    label: 'All Products',
    icon: Package,
    description: 'Manage inventory',
    color: 'from-blue-500 to-indigo-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: FolderOpen,
    description: 'Organize structure',
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
];

interface DashboardCardProps {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  trend?: { value: number; isPositive: boolean };
}

function DashboardCard({ label, value, icon: Icon, gradient, trend }: DashboardCardProps) {
  return (
    <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${gradient} opacity-10 rounded-full -mr-16 -mt-16`} />
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">{label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
            {trend && (
              <p className={`mt-2 text-sm font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% vs last month
              </p>
            )}
          </div>
          <div className={`p-3 bg-gradient-to-br ${gradient} rounded-xl`}>
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

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    tab?: string; 
    search?: string; 
    status?: string; 
    seller?: string;
    page?: string;
    category?: string;
    condition?: string;
    priceMin?: string;
    priceMax?: string;
  }>;
}) {
  const params = await searchParams;
  const activeTab = params.tab || 'approval';

  const [approvalData, appealsData, allProductsData, categoriesData, sellersData] = await Promise.all([
    activeTab === 'approval' ? getApprovalQueue(params.search, params.seller) : null,
    activeTab === 'appeals' ? getAppeals() : null,
    getAllProducts(params.search, params.status, params.seller),
    activeTab === 'categories' ? getCategories() : null,
    getSellers(),
  ]);

  const totalProducts = allProductsData?.products?.length || 0;
  const activeProducts = allProductsData?.products?.filter((p: any) => p.is_available && !p.is_suspended && !p.admin_suspended).length || 0;
  const pendingApprovals = approvalData?.count || 0;
  const pendingAppeals = appealsData?.appeals?.filter((a: any) => a.status === 'pending').length || 0;
  const totalSellers = sellersData?.sellers?.length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <LayoutDashboard className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Product Management</h1>
              <p className="text-gray-600 mt-1">Enterprise-grade product administration and oversight</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <DashboardCard label="Total Products" value={totalProducts.toLocaleString()} icon={Package} gradient="from-blue-500 to-indigo-600" trend={{ value: 12, isPositive: true }} />
          <DashboardCard label="Active Products" value={activeProducts.toLocaleString()} icon={Package} gradient="from-green-500 to-emerald-600" trend={{ value: 8, isPositive: true }} />
          <DashboardCard label="Pending Approvals" value={pendingApprovals.toLocaleString()} icon={Clock} gradient="from-orange-500 to-red-600" />
          <DashboardCard label="Pending Appeals" value={pendingAppeals.toLocaleString()} icon={MessageSquare} gradient="from-pink-500 to-rose-600" />
          <DashboardCard label="Active Sellers" value={totalSellers.toLocaleString()} icon={Users} gradient="from-purple-500 to-pink-600" trend={{ value: 5, isPositive: true }} />
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4">
            {TABS.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count = 
                tab.id === 'approval' ? approvalData?.count || 0 :
                tab.id === 'appeals' ? pendingAppeals :
                tab.id === 'all' ? allProductsData?.products?.length || 0 :
                categoriesData?.categories?.length || 0;

              return (
                <a key={tab.id} href={`?tab=${tab.id}`} className={`relative p-6 flex items-center gap-4 transition-all duration-300 group ${index < TABS.length - 1 ? 'border-r border-gray-200' : ''} ${isActive ? tab.bgColor : 'hover:bg-gray-50'}`}>
                  {isActive && <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tab.color}`} />}
                  <div className={`p-3 rounded-xl transition-all duration-300 ${isActive ? `bg-gradient-to-br ${tab.color}` : 'bg-gray-100 group-hover:bg-gray-200'}`}>
                    <Icon className={`h-6 w-6 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold ${isActive ? tab.textColor : 'text-gray-700'}`}>{tab.label}</p>
                      {count > 0 && <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isActive ? `${tab.bgColor} ${tab.textColor}` : 'bg-gray-200 text-gray-700'}`}>{count}</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{tab.description}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        <Suspense fallback={<LoadingState />}>
          {activeTab === 'approval' && approvalData && <ApprovalQueue data={approvalData} sellers={sellersData?.sellers || []} search={params.search} />}
          {activeTab === 'appeals' && appealsData && <AppealsManager appeals={appealsData.appeals} />}
          {activeTab === 'all' && allProductsData && <AllProducts data={allProductsData} sellers={sellersData?.sellers || []} search={params.search} status={params.status} seller={params.seller} />}
          {activeTab === 'categories' && categoriesData && <CategoryManager data={categoriesData} />}
        </Suspense>
      </div>
    </div>
  );
}