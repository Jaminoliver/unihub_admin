'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Trash2, Power, PowerOff } from 'lucide-react';
import { toggleFeatureFlag, deleteFeatureFlag } from '@/app/admin/dashboard/settings/features/actions';
import { AddFeatureFlagModal } from './AddFeatureFlagModal';

interface FeatureFlag {
  id: string;
  flag_key: string;
  flag_name: string;
  description: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function FeatureFlagsManagement({ flags }: { flags: FeatureFlag[] }) {
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);

  const handleToggle = (flagId: string, currentState: boolean) => {
    startTransition(async () => {
      const result = await toggleFeatureFlag(flagId, !currentState);
      if (!result.success) {
        alert(result.error);
      }
    });
  };

  const handleDelete = (flagId: string, flagName: string) => {
    if (!confirm(`Delete "${flagName}" feature flag?`)) return;
    
    startTransition(async () => {
      const result = await deleteFeatureFlag(flagId);
      if (!result.success) {
        alert(result.error);
      }
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Feature Flags ({flags.length})</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Control platform features without code deployment
            </p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Flag
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{flag.flag_name}</h3>
                    <Badge variant={flag.is_enabled ? 'default' : 'secondary'}>
                      {flag.is_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {flag.description || 'No description'}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>Key: <code className="bg-gray-100 px-2 py-0.5 rounded">{flag.flag_key}</code></span>
                    <span>Updated: {formatDate(flag.updated_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggle(flag.id, flag.is_enabled)}
                    disabled={isPending}
                    className={flag.is_enabled ? 'text-green-600' : 'text-gray-600'}
                  >
                    {flag.is_enabled ? (
                      <Power className="h-4 w-4" />
                    ) : (
                      <PowerOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingFlag(flag);
                      setShowModal(true);
                    }}
                    disabled={isPending}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(flag.id, flag.flag_name)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {showModal && (
        <AddFeatureFlagModal
          flag={editingFlag}
          onClose={() => {
            setShowModal(false);
            setEditingFlag(null);
          }}
        />
      )}
    </>
  );
}