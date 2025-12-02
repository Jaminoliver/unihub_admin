'use client';

import { useState, useTransition } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AddStateModal } from './AddStateModal';
import { AddUniversityModal } from './AddUniversityModal';
import { 
  createState, 
  updateState, 
  deleteState, 
  createUniversity, 
  updateUniversity, 
  deleteUniversity 
} from '@/app/admin/dashboard/settings/actions';

interface LocationsManagerProps {
  states: any[];
  universities: any[];
}

export function LocationsManager({ states, universities }: LocationsManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [showStateModal, setShowStateModal] = useState(false);
  const [showUniversityModal, setShowUniversityModal] = useState(false);
  const [editingState, setEditingState] = useState<any>(null);
  const [editingUniversity, setEditingUniversity] = useState<any>(null);

  const handleDeleteState = (stateId: string) => {
    if (!confirm('Delete this state? All linked universities will be affected.')) return;
    
    startTransition(async () => {
      const result = await deleteState(stateId);
      if (!result.success) alert(result.error);
    });
  };

  const handleDeleteUniversity = (universityId: string) => {
    if (!confirm('Delete this university?')) return;
    
    startTransition(async () => {
      const result = await deleteUniversity(universityId);
      if (!result.success) alert(result.error);
    });
  };

  return (
    <>
      <Tabs defaultValue="states">
        <TabsList>
          <TabsTrigger value="states">States ({states.length})</TabsTrigger>
          <TabsTrigger value="universities">Universities ({universities.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="states">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Nigerian States</CardTitle>
              <Button onClick={() => setShowStateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add State
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {states.map((state) => {
                  const uniCount = universities.filter(u => u.state === state.name).length;
                  return (
                    <div
                      key={state.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium">{state.name}</p>
                        <p className="text-sm text-gray-600">{uniCount} universities</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingState(state);
                            setShowStateModal(true);
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteState(state.id)}
                          disabled={uniCount > 0}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="universities">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Universities</CardTitle>
              <Button onClick={() => setShowUniversityModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add University
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {universities.map((university) => (
                  <div
                    key={university.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{university.name}</p>
                      <p className="text-sm text-gray-600">{university.state} • {university.city}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingUniversity(university);
                          setShowUniversityModal(true);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUniversity(university.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showStateModal && (
        <AddStateModal
          state={editingState}
          onClose={() => {
            setShowStateModal(false);
            setEditingState(null);
          }}
        />
      )}

      {showUniversityModal && (
        <AddUniversityModal
          university={editingUniversity}
          states={states}
          onClose={() => {
            setShowUniversityModal(false);
            setEditingUniversity(null);
          }}
        />
      )}
    </>
  );
}