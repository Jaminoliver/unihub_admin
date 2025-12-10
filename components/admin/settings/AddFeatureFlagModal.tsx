'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createFeatureFlag, updateFeatureFlag } from '@/app/admin/dashboard/settings/features/actions';

interface AddFeatureFlagModalProps {
  flag?: any;
  onClose: () => void;
}

export function AddFeatureFlagModal({ flag, onClose }: AddFeatureFlagModalProps) {
  const [formData, setFormData] = useState({
    flag_key: flag?.flag_key || '',
    flag_name: flag?.flag_name || '',
    description: flag?.description || '',
    is_enabled: flag?.is_enabled || false,
  });
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!formData.flag_name) {
      alert('Please enter a flag name');
      return;
    }

    if (!flag && !formData.flag_key) {
      alert('Please enter a flag key');
      return;
    }

    startTransition(async () => {
      const result = flag
        ? await updateFeatureFlag(flag.id, formData.flag_name, formData.description)
        : await createFeatureFlag(
            formData.flag_key,
            formData.flag_name,
            formData.description,
            formData.is_enabled
          );

      if (result.success) {
        onClose();
      } else {
        alert(result.error);
      }
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{flag ? 'Edit Feature Flag' : 'Add Feature Flag'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!flag && (
            <div>
              <Label>Flag Key (unique identifier)</Label>
              <Input
                value={formData.flag_key}
                onChange={(e) => setFormData({ ...formData, flag_key: e.target.value })}
                placeholder="e.g. enable_new_feature"
                disabled={!!flag}
              />
              <p className="text-xs text-gray-500 mt-1">
                Use lowercase with underscores. Cannot be changed after creation.
              </p>
            </div>
          )}
          
          <div>
            <Label>Display Name</Label>
            <Input
              value={formData.flag_name}
              onChange={(e) => setFormData({ ...formData, flag_name: e.target.value })}
              placeholder="e.g. New Feature"
            />
          </div>

          <div>
            <Label>Description</Label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What does this feature flag control?"
              className="w-full border rounded-md p-2 min-h-[80px]"
            />
          </div>

          {!flag && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_enabled"
                checked={formData.is_enabled}
                onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="is_enabled" className="cursor-pointer">
                Enable this feature immediately
              </Label>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button onClick={onClose} variant="outline" disabled={isPending} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending} className="flex-1">
              {isPending ? 'Saving...' : flag ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}