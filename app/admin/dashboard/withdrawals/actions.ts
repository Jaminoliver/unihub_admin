'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function processWithdrawal(withdrawalId: string) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Session error:', sessionError);
      return { 
        success: false, 
        error: 'Unauthorized. Please log in.' 
      };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log('Calling edge function with:', { withdrawalId, supabaseUrl });

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        error: 'Configuration error. Missing Supabase credentials.'
      };
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/Process-withdrawal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ withdrawalId }),
      }
    );

    const text = await response.text();
    console.log('Raw response:', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse response:', text);
      return {
        success: false,
        error: 'Invalid response from server'
      };
    }

    console.log('Edge function response:', { status: response.status, data });

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || 'Failed to process withdrawal'
      };
    }

    revalidatePath('/admin/withdrawals');

    return {
      success: true,
      message: 'Withdrawal processed successfully',
      transferCode: data.transferCode,
      newBalance: data.newBalance
    };

  } catch (error: any) {
    console.error('Process withdrawal error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

export async function processAllWithdrawals(withdrawalIds: string[]) {
  const results = [];
  
  for (const id of withdrawalIds) {
    const result = await processWithdrawal(id);
    results.push({ id, ...result });
    
    if (withdrawalIds.indexOf(id) < withdrawalIds.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  return {
    success: failed === 0,
    message: `Processed ${successful} withdrawal(s) successfully. ${failed} failed.`,
    results
  };
}