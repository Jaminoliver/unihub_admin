import { Suspense } from 'react';
import { MapPin } from 'lucide-react';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { LocationsManager } from '@/components/admin/settings/LocationsManager';

export default async function LocationsPage() {
  const supabase = createAdminSupabaseClient();

  const { data: states } = await supabase
    .from('states')
    .select('*')
    .order('name');

  const { data: universities } = await supabase
    .from('universities')
    .select('*')
    .order('name');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <MapPin className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">States & Universities</h1>
              <p className="text-gray-600 mt-1">Manage states and universities database</p>
            </div>
          </div>
        </div>

        <Suspense fallback={<div>Loading...</div>}>
          <LocationsManager 
            states={states || []} 
            universities={universities || []} 
          />
        </Suspense>
      </div>
    </div>
  );
}