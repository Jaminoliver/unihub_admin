import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default async function CommissionSettingsPage() {
  const COMMISSION_RULES = {
    tier1: { threshold: 20000, paystack_fee: 1.5, unihub_commission: 0.5, pod_enabled: true },
    tier2: { threshold: 35000, paystack_fee: 1.5, unihub_commission: 3.5, pod_enabled: true },
    tier3: { paystack_fee: 1.5, unihub_commission: 3.5, pod_enabled: false },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
              <DollarSign className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Commission Settings</h1>
              <p className="text-gray-600 mt-1">Platform commission structure (Read-Only)</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Commission Structure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold">Tier 1: Below ₦{COMMISSION_RULES.tier1.threshold.toLocaleString()}</h3>
                    <p className="text-sm text-gray-600">Online payments only</p>
                  </div>
                  {COMMISSION_RULES.tier1.pod_enabled && <Badge>POD Enabled</Badge>}
                </div>
                <div className="space-y-2">
                  <p className="text-sm">Paystack Fee: {COMMISSION_RULES.tier1.paystack_fee}%</p>
                  <p className="text-sm">UniHub Commission: {COMMISSION_RULES.tier1.unihub_commission}%</p>
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium">
                      Total: {COMMISSION_RULES.tier1.paystack_fee + COMMISSION_RULES.tier1.unihub_commission}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold">
                      Tier 2: ₦{COMMISSION_RULES.tier1.threshold.toLocaleString()} - ₦{(COMMISSION_RULES.tier2.threshold - 1).toLocaleString()}
                    </h3>
                    <p className="text-sm text-gray-600">All payment options available</p>
                  </div>
                  {COMMISSION_RULES.tier2.pod_enabled && <Badge>POD Enabled</Badge>}
                </div>
                <div className="space-y-2">
                  <p className="text-sm">Paystack Fee: {COMMISSION_RULES.tier2.paystack_fee}%</p>
                  <p className="text-sm">UniHub Commission: {COMMISSION_RULES.tier2.unihub_commission}%</p>
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium">
                      Total: {COMMISSION_RULES.tier2.paystack_fee + COMMISSION_RULES.tier2.unihub_commission}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-bold">Tier 3: ₦{COMMISSION_RULES.tier2.threshold.toLocaleString()}+</h3>
                    <p className="text-sm text-gray-600">No pay on delivery</p>
                  </div>
                  <Badge variant="secondary">POD Disabled</Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-sm">Paystack Fee: {COMMISSION_RULES.tier3.paystack_fee}%</p>
                  <p className="text-sm">UniHub Commission: {COMMISSION_RULES.tier3.unihub_commission}%</p>
                  <div className="mt-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium">
                      Total: {COMMISSION_RULES.tier3.paystack_fee + COMMISSION_RULES.tier3.unihub_commission}%
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Commission rules are managed in the payment Edge Function. Contact a developer to modify these settings.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}