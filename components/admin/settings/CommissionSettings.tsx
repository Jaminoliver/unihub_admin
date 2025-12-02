'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { updateCommissionSettings } from '@/app/admin/dashboard/settings/actions';

const DEFAULT_RULES = {
  tier1: { threshold: 20000, paystack_fee: 1.5, unihub_commission: 0.5, pod_enabled: true },
  tier2: { threshold: 35000, paystack_fee: 1.5, unihub_commission: 3.5, pod_enabled: true },
  tier3: { paystack_fee: 1.5, unihub_commission: 3.5, pod_enabled: false },
};

export function CommissionSettings({ settings }: { settings: any }) {
  const [rules, setRules] = useState(settings?.value || DEFAULT_RULES);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateCommissionSettings(rules);
      if (result.success) {
        alert('Commission settings updated successfully');
      } else {
        alert(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Current Commission Structure</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold">Tier 1: Below ₦{rules.tier1.threshold.toLocaleString()}</h3>
                <p className="text-sm text-gray-600">Online payments only</p>
              </div>
              {rules.tier1.pod_enabled && <Badge>POD Enabled</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Paystack Fee (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={rules.tier1.paystack_fee}
                  onChange={(e) => setRules({
                    ...rules,
                    tier1: { ...rules.tier1, paystack_fee: parseFloat(e.target.value) }
                  })}
                />
              </div>
              <div>
                <Label>UniHub Commission (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={rules.tier1.unihub_commission}
                  onChange={(e) => setRules({
                    ...rules,
                    tier1: { ...rules.tier1, unihub_commission: parseFloat(e.target.value) }
                  })}
                />
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <p className="text-sm">
                <span className="font-medium">Total:</span> {rules.tier1.paystack_fee + rules.tier1.unihub_commission}%
              </p>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold">
                  Tier 2: ₦{rules.tier1.threshold.toLocaleString()} - ₦{(rules.tier2.threshold - 1).toLocaleString()}
                </h3>
                <p className="text-sm text-gray-600">All payment options available</p>
              </div>
              {rules.tier2.pod_enabled && <Badge>POD Enabled</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Paystack Fee (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={rules.tier2.paystack_fee}
                  onChange={(e) => setRules({
                    ...rules,
                    tier2: { ...rules.tier2, paystack_fee: parseFloat(e.target.value) }
                  })}
                />
              </div>
              <div>
                <Label>UniHub Commission (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={rules.tier2.unihub_commission}
                  onChange={(e) => setRules({
                    ...rules,
                    tier2: { ...rules.tier2, unihub_commission: parseFloat(e.target.value) }
                  })}
                />
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <p className="text-sm">
                <span className="font-medium">Total:</span> {rules.tier2.paystack_fee + rules.tier2.unihub_commission}%
              </p>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold">Tier 3: ₦{rules.tier2.threshold.toLocaleString()}+</h3>
                <p className="text-sm text-gray-600">No pay on delivery</p>
              </div>
              <Badge variant="secondary">POD Disabled</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Paystack Fee (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={rules.tier3.paystack_fee}
                  onChange={(e) => setRules({
                    ...rules,
                    tier3: { ...rules.tier3, paystack_fee: parseFloat(e.target.value) }
                  })}
                />
              </div>
              <div>
                <Label>UniHub Commission (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={rules.tier3.unihub_commission}
                  onChange={(e) => setRules({
                    ...rules,
                    tier3: { ...rules.tier3, unihub_commission: parseFloat(e.target.value) }
                  })}
                />
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <p className="text-sm">
                <span className="font-medium">Total:</span> {rules.tier3.paystack_fee + rules.tier3.unihub_commission}%
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setRules(settings?.value || DEFAULT_RULES)}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Threshold Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tier 1 Upper Limit (₦)</Label>
            <Input
              type="number"
              value={rules.tier1.threshold}
              onChange={(e) => setRules({
                ...rules,
                tier1: { ...rules.tier1, threshold: parseInt(e.target.value) }
              })}
            />
          </div>
          <div>
            <Label>Tier 2 Upper Limit (₦)</Label>
            <Input
              type="number"
              value={rules.tier2.threshold}
              onChange={(e) => setRules({
                ...rules,
                tier2: { ...rules.tier2, threshold: parseInt(e.target.value) }
              })}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}