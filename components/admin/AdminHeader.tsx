// components/admin/AdminHeader.tsx
'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AdminHeaderProps {
  session: {
    full_name: string;
    email: string;
  };
}

export function AdminHeader({ session }: AdminHeaderProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Try to call logout API
      await fetch('/api/admin/logout', { 
        method: 'POST',
        credentials: 'include',
      }).catch(() => {
        // Ignore fetch errors, the redirect might cause them
        console.log('Logout request sent');
      });
      
      // Always redirect after attempting logout
      router.push('/admin/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
      // Still redirect even on error
      router.push('/admin/login');
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Welcome back, {session.full_name}
        </h2>
      </div>
      
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleLogout}
        disabled={isLoggingOut}
      >
        <LogOut className="h-4 w-4 mr-2" />
        {isLoggingOut ? 'Signing out...' : 'Sign Out'}
      </Button>
    </header>
  );
}