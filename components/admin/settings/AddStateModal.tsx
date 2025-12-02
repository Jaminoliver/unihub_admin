'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createState, updateState } from '@/app/admin/dashboard/settings/actions';

interface AddStateModalProps {
  state?: any;
  onClose: () => void;
}

export function AddStateModal({ state, onClose }: AddStateModalProps) {
  const [name, setName] = useState(state?.name || '');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('State name is required');
      return;
    }

    startTransition(async () => {
      const result = state
        ? await updateState(state.id, name)
        : await createState(name);

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
          <DialogTitle>{state ? 'Edit State' : 'Add State'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>State Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Lagos"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Saving...' : state ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}