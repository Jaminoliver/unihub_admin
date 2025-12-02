'use server';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function processWithdrawal(withdrawalId: string) {
  try {
    const supabase = createAdminSupabaseClient();

    // Get withdrawal details
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*, seller:sellers(business_name, email, user_id)')
      .eq('id', withdrawalId)
      .single();

    if (fetchError || !withdrawal) {
      return { success: false, error: 'Withdrawal request not found' };
    }

    // Check if already processed
    if (!['pending', 'on_hold'].includes(withdrawal.status)) {
      return { success: false, error: 'This withdrawal has already been processed' };
    }

    // Update status to processing
    await supabase
      .from('withdrawal_requests')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', withdrawalId);

    // Call edge function to process via Paystack
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-withdrawal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ withdrawalId }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      // Update status to failed
      await supabase
        .from('withdrawal_requests')
        .update({ 
          status: 'failed',
          failure_reason: result.error || 'Failed to process withdrawal',
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawalId);

      return { success: false, error: result.error || 'Failed to process withdrawal' };
    }

    revalidatePath('/admin/dashboard/withdrawals');
    return { success: true };
  } catch (error: any) {
    console.error('Process withdrawal error:', error);
    return { success: false, error: error.message || 'Failed to process withdrawal' };
  }
}

export async function rejectWithdrawal(
  withdrawalId: string,
  rejectionReason: string,
  adminNotes?: string
) {
  try {
    const supabase = createAdminSupabaseClient();

    // Get withdrawal details
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*, seller:sellers(business_name, email, user_id, wallet_balance)')
      .eq('id', withdrawalId)
      .single();

    if (fetchError || !withdrawal) {
      return { success: false, error: 'Withdrawal request not found' };
    }

    // Check if can be rejected
    if (!['pending', 'on_hold'].includes(withdrawal.status)) {
      return { success: false, error: 'Only pending or on-hold withdrawals can be rejected' };
    }

    const amount = parseFloat(withdrawal.amount);
    const currentBalance = parseFloat(withdrawal.seller.wallet_balance);
    const newBalance = currentBalance + amount;

    // Start transaction: Update withdrawal status and refund wallet
    const { error: updateError } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'rejected',
        rejected_reason: rejectionReason,
        admin_notes: adminNotes || null,
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawalId);

    if (updateError) {
      return { success: false, error: 'Failed to update withdrawal status' };
    }

    // Refund to wallet
    const { error: walletError } = await supabase
      .from('sellers')
      .update({ wallet_balance: newBalance })
      .eq('id', withdrawal.seller_id);

    if (walletError) {
      return { success: false, error: 'Failed to refund wallet' };
    }

    // Log wallet transaction
    await supabase
      .from('wallet_transactions')
      .insert({
        seller_id: withdrawal.seller_id,
        transaction_type: 'refund',
        amount: amount.toString(),
        balance_after: newBalance.toString(),
        description: `Withdrawal rejected: ${rejectionReason}`,
        reference: `REJ_${withdrawalId.substring(0, 8)}`,
        status: 'completed'
      });

    // Create notification for seller
    await supabase
      .from('notifications')
      .insert({
        user_id: withdrawal.seller.user_id,
        type: 'withdrawal_rejected',
        title: 'Withdrawal Request Rejected',
        message: `Your withdrawal request of ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} has been rejected. Reason: ${rejectionReason}. The amount has been refunded to your wallet.`,
        data: { withdrawal_id: withdrawalId, amount, reason: rejectionReason }
      });

    revalidatePath('/admin/dashboard/withdrawals');
    return { success: true };
  } catch (error: any) {
    console.error('Reject withdrawal error:', error);
    return { success: false, error: error.message || 'Failed to reject withdrawal' };
  }
}

export async function putWithdrawalOnHold(
  withdrawalId: string,
  holdReason: string
) {
  try {
    const supabase = createAdminSupabaseClient();

    // Get withdrawal details
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*, seller:sellers(business_name, email, user_id)')
      .eq('id', withdrawalId)
      .single();

    if (fetchError || !withdrawal) {
      return { success: false, error: 'Withdrawal request not found' };
    }

    // Check if pending
    if (withdrawal.status !== 'pending') {
      return { success: false, error: 'Only pending withdrawals can be put on hold' };
    }

    // Update status to on_hold
    const { error: updateError } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'on_hold',
        admin_notes: holdReason,
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawalId);

    if (updateError) {
      return { success: false, error: 'Failed to put withdrawal on hold' };
    }

    // Create notification for seller
    await supabase
      .from('notifications')
      .insert({
        user_id: withdrawal.seller.user_id,
        type: 'withdrawal_on_hold',
        title: 'Withdrawal Request On Hold',
        message: `Your withdrawal request of ₦${parseFloat(withdrawal.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })} has been put on hold for review. Reason: ${holdReason}`,
        data: { withdrawal_id: withdrawalId, reason: holdReason }
      });

    revalidatePath('/admin/dashboard/withdrawals');
    return { success: true };
  } catch (error: any) {
    console.error('Put withdrawal on hold error:', error);
    return { success: false, error: error.message || 'Failed to put withdrawal on hold' };
  }
}

export async function resumeWithdrawal(withdrawalId: string) {
  try {
    const supabase = createAdminSupabaseClient();

    // Get withdrawal details
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawalId)
      .single();

    if (fetchError || !withdrawal) {
      return { success: false, error: 'Withdrawal request not found' };
    }

    // Check if on hold
    if (withdrawal.status !== 'on_hold') {
      return { success: false, error: 'Only on-hold withdrawals can be resumed' };
    }

    // Update status back to pending
    const { error: updateError } = await supabase
      .from('withdrawal_requests')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawalId);

    if (updateError) {
      return { success: false, error: 'Failed to resume withdrawal' };
    }

    revalidatePath('/admin/dashboard/withdrawals');
    return { success: true };
  } catch (error: any) {
    console.error('Resume withdrawal error:', error);
    return { success: false, error: error.message || 'Failed to resume withdrawal' };
  }
}

export async function processAllWithdrawals(withdrawalIds: string[]) {
  try {
    const supabase = createAdminSupabaseClient();

    // Validate input
    if (!withdrawalIds || withdrawalIds.length === 0) {
      return { success: false, message: 'No withdrawals to process' };
    }

    // Get all withdrawal details
    const { data: withdrawals, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*, seller:sellers(business_name, email, user_id)')
      .in('id', withdrawalIds);

    if (fetchError || !withdrawals) {
      return { success: false, message: 'Failed to fetch withdrawal requests' };
    }

    // Filter only pending/on_hold withdrawals
    const processableWithdrawals = withdrawals.filter(w => 
      ['pending', 'on_hold'].includes(w.status)
    );

    if (processableWithdrawals.length === 0) {
      return { 
        success: false, 
        message: 'No pending withdrawals to process' 
      };
    }

    // Update all to processing status first
    await supabase
      .from('withdrawal_requests')
      .update({ 
        status: 'processing', 
        updated_at: new Date().toISOString() 
      })
      .in('id', processableWithdrawals.map(w => w.id));

    // Process each withdrawal through Paystack
    const results = await Promise.allSettled(
      processableWithdrawals.map(async (withdrawal) => {
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-withdrawal`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              },
              body: JSON.stringify({ withdrawalId: withdrawal.id }),
            }
          );

          const result = await response.json();

          if (!response.ok) {
            // Update to failed
            await supabase
              .from('withdrawal_requests')
              .update({ 
                status: 'failed',
                failure_reason: result.error || 'Failed to process withdrawal',
                updated_at: new Date().toISOString()
              })
              .eq('id', withdrawal.id);

            return { id: withdrawal.id, success: false, error: result.error };
          }

          return { id: withdrawal.id, success: true };
        } catch (error: any) {
          // Update to failed
          await supabase
            .from('withdrawal_requests')
            .update({ 
              status: 'failed',
              failure_reason: error.message || 'Processing error',
              updated_at: new Date().toISOString()
            })
            .eq('id', withdrawal.id);

          return { id: withdrawal.id, success: false, error: error.message };
        }
      })
    );

    // Count successes and failures
    const successful = results.filter(
      r => r.status === 'fulfilled' && r.value.success
    ).length;
    
    const failed = results.filter(
      r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
    ).length;

    // Revalidate the page
    revalidatePath('/admin/dashboard/withdrawals');

    // Return appropriate message
    if (successful === processableWithdrawals.length) {
      return {
        success: true,
        message: `Successfully processed all ${successful} withdrawal(s)`
      };
    } else if (successful > 0) {
      return {
        success: true,
        message: `Processed ${successful} withdrawal(s). ${failed} failed.`
      };
    } else {
      return {
        success: false,
        message: `Failed to process all ${failed} withdrawal(s)`
      };
    }

  } catch (error: any) {
    console.error('Process all withdrawals error:', error);
    return { 
      success: false, 
      message: error.message || 'Failed to process withdrawals' 
    };
  }
}