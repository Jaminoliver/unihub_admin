'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createUniversity, updateUniversity } from '@/app/admin/dashboard/settings/actions';

interface AddUniversityModalProps {
  university?: any;
  states: any[];
  onClose: () => void;
}

export function AddUniversityModal({ university, states, onClose }: AddUniversityModalProps) {
  const [name, setName] = useState(university?.name || '');
  const [shortName, setShortName] = useState(university?.short_name || '');
  const [state, setState] = useState(university?.state || '');
  const [city, setCity] = useState(university?.city || '');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!name.trim() || !state) {
      alert('University name and state are required');
      return;
    }

    startTransition(async () => {
      const result = university
        ? await updateUniversity(university.id, name, shortName, state, city)
        : await createUniversity(name, shortName, state, city);

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
          <DialogTitle>{university ? 'Edit University' : 'Add University'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>University Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., University of Lagos"
            />
          </div>
          <div>
            <Label>Short Name</Label>
            <Input
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="e.g., UNILAG"
            />
          </div>
          <div>
            <Label>State</Label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full border rounded-md p-2"
            >
              <option value="">Select State</option>
              {states.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>City</Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., Lagos"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Saving...' : university ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}