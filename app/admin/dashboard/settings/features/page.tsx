import { requirePermission } from '@/lib/rbac/check-permission';
import { getFeatureFlags } from './actions';
import { FeatureFlagsManagement } from '@/components/admin/settings/FeatureFlagsManagement';

export default async function FeatureFlagsPage() {
  await requirePermission('manage_feature_flags');

  const { data: flags } = await getFeatureFlags();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1800px] mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Feature Flags</h1>
          <p className="text-gray-600 mt-1">
            Enable or disable platform features without deploying new code
          </p>
        </div>

        <FeatureFlagsManagement flags={flags || []} />
      </div>
    </div>
  );
}