// Save this as: app/api/debug-orders/route.ts

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        details: userError?.message 
      });
    }

    // 2. Check if user is admin
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, email, role')
      .eq('email', user.email)
      .maybeSingle();

    // 3. Try to fetch orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(5);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
      },
      admin: admin || null,
      adminError: adminError?.message || null,
      ordersCount: orders?.length || 0,
      ordersError: ordersError?.message || null,
      ordersData: orders || [],
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}