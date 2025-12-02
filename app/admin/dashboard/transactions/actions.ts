'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function releaseEscrow(escrowId: string, orderId: string, reason: string) {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Get escrow and order details
    const { data: escrow, error: escrowError } = await supabase
      .from('escrow')
      .select('*')
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow) throw escrowError || new Error('Escrow not found');

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, seller_id, buyer_id, order_number, seller_payout_amount, payment_method')
      .eq('id', orderId)
      .single();

    if (orderError || !order) throw orderError || new Error('Order not found');

    // 2. Get seller info to update wallet
    const { data: seller, error: sellerFetchError } = await supabase
      .from('sellers')
      .select('wallet_balance, user_id')
      .eq('user_id', escrow.seller_id)
      .single();

    if (sellerFetchError || !seller) throw sellerFetchError || new Error('Seller not found');

    const currentBalance = parseFloat(seller.wallet_balance || '0');
    const releaseAmount = parseFloat(escrow.amount);
    const newBalance = currentBalance + releaseAmount;

    // 3. Update seller's wallet balance
    const { error: walletError } = await supabase
      .from('sellers')
      .update({ wallet_balance: newBalance })
      .eq('user_id', escrow.seller_id);

    if (walletError) throw walletError;

    // 4. Update escrow table
    const { error: escrowUpdateError } = await supabase
      .from('escrow')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
      })
      .eq('id', escrowId);

    if (escrowUpdateError) throw escrowUpdateError;

    // 5. Update order status
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        order_status: 'completed',
        escrow_released: true,
        admin_notes: reason,
      })
      .eq('id', orderId);

    if (orderUpdateError) throw orderUpdateError;

    // 6. Create transaction record for escrow release
    const { error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: escrow.seller_id,
        order_id: orderId,
        transaction_type: 'payout',
        amount: escrow.amount,
        status: 'success',
        payment_provider: 'escrow',
        payment_reference: `ESC-RELEASE-${order.order_number}`,
        metadata: {
          type: 'escrow_release',
          reason: reason,
          released_by: 'admin',
          released_at: new Date().toISOString(),
          order_number: order.order_number,
          payment_method: order.payment_method,
          escrow_id: escrowId,
          previous_balance: currentBalance,
          new_balance: newBalance,
        },
      });

    if (txnError) throw txnError;

    revalidatePath('/admin/dashboard/transactions/escrow');
    revalidatePath('/admin/dashboard/transactions/all');
    return { success: true };
  } catch (error: any) {
    console.error('Release escrow error:', error);
    return { success: false, error: error.message };
  }
}

export async function refundEscrow(escrowId: string, orderId: string, reason: string) {
  try {
    const supabase = await createServerSupabaseClient();

    // 1. Get escrow and order details
    const { data: escrow, error: escrowError } = await supabase
      .from('escrow')
      .select('*')
      .eq('id', escrowId)
      .single();

    if (escrowError || !escrow) throw escrowError || new Error('Escrow not found');

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, buyer_id, order_number, payment_method')
      .eq('id', orderId)
      .single();

    if (orderError || !order) throw orderError || new Error('Order not found');

    // 2. Update escrow table
    const { error: escrowUpdateError } = await supabase
      .from('escrow')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        refund_reason: reason,
      })
      .eq('id', escrowId);

    if (escrowUpdateError) throw escrowUpdateError;

    // 3. Update order status
    const { error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        order_status: 'refunded',
        payment_status: 'refunded',
        escrow_amount: 0,
        refund_initiated_at: new Date().toISOString(),
        refund_completed_at: new Date().toISOString(),
        admin_notes: reason,
      })
      .eq('id', orderId);

    if (orderUpdateError) throw orderUpdateError;

    // 4. Create transaction record for refund
    const { error: txnError } = await supabase
      .from('transactions')
      .insert({
        user_id: escrow.buyer_id,
        order_id: orderId,
        transaction_type: 'refund',
        amount: escrow.amount,
        status: 'success',
        payment_provider: 'paystack',
        payment_reference: `ESC-REFUND-${order.order_number}`,
        metadata: {
          type: 'escrow_refund',
          reason: reason,
          refunded_by: 'admin',
          refunded_at: new Date().toISOString(),
          order_number: order.order_number,
          payment_method: order.payment_method,
          escrow_id: escrowId,
        },
      });

    if (txnError) throw txnError;

    revalidatePath('/admin/dashboard/transactions/escrow');
    revalidatePath('/admin/dashboard/transactions/all');
    return { success: true };
  } catch (error: any) {
    console.error('Refund escrow error:', error);
    return { success: false, error: error.message };
  }
}