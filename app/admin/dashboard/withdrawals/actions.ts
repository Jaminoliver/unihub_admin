'use server';



import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function processWithdrawal(withdrawalId: string) {
  console.log(`[Admin] Starting payout for Withdrawal ID: ${withdrawalId}`);

  try {
    const supabase = createAdminSupabaseClient();

    // 1. Get withdrawal details
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*, seller:sellers(business_name, email, user_id, available_balance)')
      .eq('id', withdrawalId)
      .single();

    if (fetchError || !withdrawal) {
      console.error('[Admin] Error fetching withdrawal:', fetchError);
      return { success: false, error: 'Withdrawal request not found' };
    }

    // 2. Check if already processed
    if (!['pending', 'on_hold'].includes(withdrawal.status)) {
      console.warn(`[Admin] Withdrawal ${withdrawalId} skipped. Status: ${withdrawal.status}`);
      return { success: false, error: 'This withdrawal has already been processed' };
    }

    // 3. Update status to processing (Lock it so it doesn't run twice)
    await supabase
      .from('withdrawal_requests')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', withdrawalId);

    console.log(`[Admin] Calling Edge Function for Withdrawal ${withdrawalId}...`);
    
    // IMPORTANT: Function name must match exactly - capital P in "Process-withdrawal"
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/Process-withdrawal`;
    
    console.log(`[Admin] Edge Function URL: ${edgeFunctionUrl}`);
    console.log(`[Admin] Has Service Role Key: ${!!process.env.SUPABASE_SERVICE_ROLE_KEY}`);
    
    const requestBody = { withdrawalId };
    console.log(`[Admin] Request body:`, JSON.stringify(requestBody));

    // 4. Call edge function (Paystack)
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': `${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    console.log(`[Admin] Response Status: ${response.status} ${response.statusText}`);
    console.log(`[Admin] Response Headers:`, Object.fromEntries(response.headers.entries()));
    
    let result;
    try {
      const responseText = await response.text();
      console.log(`[Admin] Raw response:`, responseText);
      result = JSON.parse(responseText);
      console.log(`[Admin] Edge Function Response:`, JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error(`[Admin] Failed to parse response:`, parseError);
      result = { error: 'Failed to parse response' };
    }

    if (!response.ok) {
      console.error(`[Admin] Payout Failed. Reason: ${result.error || 'Unknown'}`);
      
      // =========================================================
      // FAILURE HANDLER: REFUND THE SELLER - FIXED VERSION
      // =========================================================
      
      const currentBalance = parseFloat(withdrawal.seller.available_balance || '0');
      const refundAmount = parseFloat(withdrawal.amount);
      const newBalance = currentBalance + refundAmount;
      
      console.log(`[Admin] Refunding ₦${refundAmount} to Seller ${withdrawal.seller_id}`);

      // B. Refund Balance
      const { error: refundError } = await supabase
        .from('sellers')
        .update({ 
          available_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawal.seller_id);

      if (refundError) console.error('[Admin] Refund Balance Update Failed:', refundError);

      // C. Log Refund Transaction - FIXED
      const { error: logError } = await supabase
        .from('wallet_transactions')
        .insert({
          seller_id: withdrawal.seller_id,
          order_id: null,
          transaction_type: 'credit',
          amount: refundAmount,
          balance_after: newBalance,
          description: `Refund: Processing failed for withdrawal`,
          reference: withdrawalId,
          status: 'completed',
          clears_at: null
        });
        
      if (logError) console.error('[Admin] Refund Log Failed:', logError);

      // D. Mark Withdrawal as Failed
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

    // Success
    console.log(`[Admin] Payout Successful for ${withdrawalId}`);
    revalidatePath('/admin/dashboard/withdrawals');
    return { success: true };

  } catch (error: any) {
    console.error('[Admin] CRITICAL PROCESS ERROR:', error);
    return { success: false, error: error.message || 'Failed to process withdrawal' };
  }
}

export async function processAllWithdrawals(withdrawalIds: string[]) {
  try {
    const supabase = createAdminSupabaseClient();
    console.log(`[Admin] Batch processing ${withdrawalIds.length} withdrawals`);

    if (!withdrawalIds || withdrawalIds.length === 0) {
      return { success: false, message: 'No withdrawals to process' };
    }

    // Get all withdrawal details
    const { data: withdrawals, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*, seller:sellers(business_name, email, user_id, available_balance)')
      .in('id', withdrawalIds);

    if (fetchError || !withdrawals) {
      return { success: false, message: 'Failed to fetch withdrawal requests' };
    }

    const processableWithdrawals = withdrawals.filter(w => 
      ['pending', 'on_hold'].includes(w.status)
    );

    if (processableWithdrawals.length === 0) {
      return { success: false, message: 'No pending withdrawals to process' };
    }

    // Mark all as processing first
    await supabase
      .from('withdrawal_requests')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .in('id', processableWithdrawals.map(w => w.id));

    // Process individually with logging
    const results = await Promise.allSettled(
      processableWithdrawals.map(async (withdrawal) => {
        try {
          console.log(`[Batch] Processing ${withdrawal.id}`);
          console.log(`[Batch] Edge Function URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-withdrawal`);
          
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

          console.log(`[Batch] Response Status for ${withdrawal.id}: ${response.status}`);
          const result = await response.json();
          console.log(`[Batch] Response:`, JSON.stringify(result, null, 2));

          if (!response.ok) {
            console.error(`[Batch] Failed ${withdrawal.id}:`, result);

            // REFUND LOGIC - FIXED
            const currentBal = parseFloat(withdrawal.seller.available_balance || '0');
            const refundAmt = parseFloat(withdrawal.amount);
            const newBal = currentBal + refundAmt;

            await supabase.from('sellers').update({
              available_balance: newBal,
              updated_at: new Date().toISOString()
            }).eq('id', withdrawal.seller_id);

            await supabase.from('wallet_transactions').insert({
              seller_id: withdrawal.seller_id,
              order_id: null,
              transaction_type: 'credit',
              amount: refundAmt,
              balance_after: newBal,
              description: `Refund: Bulk processing failed`,
              reference: withdrawal.id,
              status: 'completed',
              clears_at: null
            });

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
          console.error(`[Batch] Exception for ${withdrawal.id}:`, error);
          
          // Catch-all Refund Logic - FIXED
          const currentBal = parseFloat(withdrawal.seller.available_balance || '0');
          const refundAmt = parseFloat(withdrawal.amount);
          const newBal = currentBal + refundAmt;

          await supabase.from('sellers').update({
            available_balance: newBal
          }).eq('id', withdrawal.seller_id);

          await supabase.from('wallet_transactions').insert({
            seller_id: withdrawal.seller_id,
            order_id: null,
            transaction_type: 'credit',
            amount: refundAmt,
            balance_after: newBal,
            description: `Refund: Exception during processing`,
            reference: withdrawal.id,
            status: 'completed',
            clears_at: null
          });

          await supabase
            .from('withdrawal_requests')
            .update({ 
              status: 'failed',
              failure_reason: error.message || 'Exception during processing',
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

    revalidatePath('/admin/dashboard/withdrawals');

    if (successful === processableWithdrawals.length) {
      return { success: true, message: `Successfully processed all ${successful} withdrawal(s)` };
    } else if (successful > 0) {
      return { success: true, message: `Processed ${successful} withdrawal(s). ${failed} failed.` };
    } else {
      return { success: false, message: `Failed to process all ${failed} withdrawal(s)` };
    }

  } catch (error: any) {
    console.error('Process all withdrawals error:', error);
    return { success: false, message: error.message || 'Failed to process withdrawals' };
  }
}

export async function rejectWithdrawal(withdrawalId: string, rejectionReason: string, adminNotes?: string) {
  try {
    const supabase = createAdminSupabaseClient();

    // Get withdrawal details
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*, seller:sellers(business_name, email, user_id, available_balance)')
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
    const currentBalance = parseFloat(withdrawal.seller.available_balance || '0');
    const newBalance = currentBalance + amount;

    // Start transaction: Update withdrawal status
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

    // Refund to Available Wallet Balance
    const { error: walletError } = await supabase
      .from('sellers')
      .update({ 
        available_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawal.seller_id);

    if (walletError) {
      return { success: false, error: 'Failed to refund wallet' };
    }

    // Log wallet transaction (Credit back) - FIXED
    await supabase
      .from('wallet_transactions')
      .insert({
        seller_id: withdrawal.seller_id,
        order_id: null,
        transaction_type: 'credit',
        amount: amount,
        balance_after: newBalance,
        description: `Withdrawal rejected: ${rejectionReason}`,
        reference: withdrawalId,
        status: 'completed',
        clears_at: null
      });

    // Create notification for seller
    await supabase
      .from('notifications')
      .insert({
        user_id: withdrawal.seller.user_id,
        type: 'withdrawal_rejected',
        title: 'Withdrawal Request Rejected',
        message: `Your withdrawal request of ₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} has been rejected. Reason: ${rejectionReason}. The amount has been refunded to your Available Balance.`,
        data: { withdrawal_id: withdrawalId, amount, reason: rejectionReason }
      });

    revalidatePath('/admin/dashboard/withdrawals');
    return { success: true };
  } catch (error: any) {
    console.error('Reject withdrawal error:', error);
    return { success: false, error: error.message || 'Failed to reject withdrawal' };
  }
}

export async function putWithdrawalOnHold(withdrawalId: string, holdReason: string) {
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