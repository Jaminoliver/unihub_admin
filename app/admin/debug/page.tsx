// Create this file: app/admin/debug/page.tsx

import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function DebugPage() {
  const supabase = await createServerSupabaseClient();
  
  // Step 1: Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  // Step 2: Try to query admins table
  let adminResult = null;
  let adminError = null;
  
  if (user) {
    const result = await supabase
      .from('admins')
      .select('*')
      .eq('email', user.email);
    
    adminResult = result.data;
    adminError = result.error;
  }

  // Step 3: Check RLS status
  let rlsCheck = null;
  try {
    const { data, error } = await supabase.rpc('check_rls_status');
    rlsCheck = { data, error };
  } catch (e) {
    rlsCheck = { error: 'RPC function not available' };
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Admin Access Debug</h1>
        
        {/* Authentication Check */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            {user ? '✅' : '❌'} Step 1: Authentication
          </h2>
          {authError ? (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="font-semibold text-red-800">Authentication Error:</p>
              <pre className="mt-2 text-sm text-red-700 overflow-auto">
                {JSON.stringify(authError, null, 2)}
              </pre>
            </div>
          ) : user ? (
            <div className="space-y-2">
              <p className="text-green-600 font-medium">✓ User authenticated</p>
              <div className="bg-gray-50 rounded p-4 text-sm">
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Email:</strong> {user.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-orange-600">No user found</p>
          )}
        </div>

        {/* Admin Table Query */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            {adminResult && adminResult.length > 0 ? '✅' : '❌'} Step 2: Admin Table Query
          </h2>
          {!user ? (
            <p className="text-gray-500">Skipped - not authenticated</p>
          ) : adminError ? (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <p className="font-semibold text-red-800">Database Error:</p>
              <pre className="mt-2 text-sm text-red-700 overflow-auto">
                {JSON.stringify(adminError, null, 2)}
              </pre>
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-semibold text-yellow-800">Common causes:</p>
                <ul className="mt-2 text-sm text-yellow-700 list-disc list-inside">
                  <li>Row Level Security (RLS) is blocking the query</li>
                  <li>No matching admin record exists</li>
                  <li>Table permissions are not set correctly</li>
                </ul>
              </div>
            </div>
          ) : adminResult && adminResult.length > 0 ? (
            <div className="space-y-2">
              <p className="text-green-600 font-medium">✓ Admin record found</p>
              <div className="bg-gray-50 rounded p-4">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(adminResult[0], null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded p-4">
              <p className="font-semibold text-orange-800">⚠️ No admin record found</p>
              <p className="mt-2 text-sm text-orange-700">
                Expected email: <code className="bg-orange-100 px-1 py-0.5 rounded">{user.email}</code>
              </p>
              <p className="mt-2 text-sm text-orange-700">
                Database email: <code className="bg-orange-100 px-1 py-0.5 rounded">benjaminegonu332@gmail.com</code>
              </p>
            </div>
          )}
        </div>

        {/* Solutions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">💡 Solutions</h2>
          <div className="space-y-4 text-sm">
            {!user && (
              <div className="bg-white rounded p-4">
                <p className="font-semibold">1. Log in first</p>
                <p className="text-gray-600 mt-1">You need to be authenticated to access admin features</p>
              </div>
            )}
            
            {user && adminError && (
              <div className="bg-white rounded p-4">
                <p className="font-semibold">1. Fix Row Level Security</p>
                <p className="text-gray-600 mt-1">Run this SQL in Supabase:</p>
                <pre className="mt-2 bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-auto">
{`-- Disable RLS temporarily to test
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;`}
                </pre>
              </div>
            )}
            
            {user && !adminError && (!adminResult || adminResult.length === 0) && (
              <div className="bg-white rounded p-4">
                <p className="font-semibold">1. Email mismatch</p>
                <p className="text-gray-600 mt-1">Your login email doesn't match the admin record. Check:</p>
                <ul className="mt-2 list-disc list-inside text-gray-600 space-y-1">
                  <li>Login email: <code className="bg-gray-100 px-1">{user.email}</code></li>
                  <li>Expected: <code className="bg-gray-100 px-1">benjaminegonu332@gmail.com</code></li>
                </ul>
              </div>
            )}

            <div className="bg-white rounded p-4">
              <p className="font-semibold">2. Alternative: Use Service Role</p>
              <p className="text-gray-600 mt-1">
                Update verifyAdmin() to use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}