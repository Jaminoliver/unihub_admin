'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createAdmin, updateAdmin } from '@/app/admin/dashboard/settings/actions';

interface AddAdminModalProps {
  admin?: any;
  onClose: () => void;
}

export function AddAdminModal({ admin, onClose }: AddAdminModalProps) {
  const [formData, setFormData] = useState({
    full_name: admin?.full_name || '',
    email: admin?.email || '',
    role: admin?.role || 'moderator',
    password: '',
  });
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!formData.full_name || !formData.email || (!admin && !formData.password)) {
      alert('Please fill all required fields');
      return;
    }

    startTransition(async () => {
      const result = admin
        ? await updateAdmin(admin.id, formData.full_name, formData.role)
        : await createAdmin(formData.full_name, formData.email, formData.password, formData.role);

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
          <DialogTitle>{admin ? 'Edit Admin' : 'Add Admin'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@unihub.com"
              disabled={!!admin}
            />
          </div>
          {!admin && (
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min 8 characters"
              />
            </div>
          )}
          <div>
            <Label>Role</Label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full border rounded-md p-2"
            >
              <option value="super_admin">Super Admin</option>
              <option value="moderator">Moderator</option>
              <option value="support">Support</option>
              <option value="financial_admin">Financial Admin</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Saving...' : admin ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}