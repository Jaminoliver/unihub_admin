'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function verifyAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: admin } = await supabase
    .from('admins')
    .select('id, email')
    .eq('email', user.email)
    .maybeSingle();

  if (!admin) throw new Error('Admin access required');
  return { supabase, admin, user };
}

// Add this to the TOP of your getAllOrders function in actions.ts
// Replace the existing function with this:

export async function getAllOrders(filters?: {
  search?: string;
  status?: string;
  paymentMethod?: string;
  sellerId?: string;
}) {
  try {
    const supabase = await createServerSupabaseClient();

    // Build query with all joins for complete data
    let query = supabase
      .from('orders')
      .select(`
        *,
        buyer:profiles!orders_buyer_id_fkey(
          id, 
          full_name, 
          email, 
          state,
          university:universities!profiles_university_id_fkey(name)
        ),
        seller:sellers!orders_seller_id_fkey(
          id, 
          business_name, 
          full_name, 
          email, 
          state,
          university:universities!sellers_university_id_fkey(name)
        ),
        product:products(
          id, 
          name, 
          image_urls
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.search) {
      query = query.ilike('order_number', `%${filters.search}%`);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('order_status', filters.status);
    }
    if (filters?.paymentMethod && filters.paymentMethod !== 'all') {
      query = query.eq('payment_method', filters.paymentMethod);
    }
    if (filters?.sellerId && filters.sellerId !== 'all') {
      query = query.eq('seller_id', filters.sellerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Orders Query Error:', error);
      throw error;
    }

    console.log('✅ Orders fetched:', data?.length);

    return { orders: data || [], error: null };
  } catch (err) {
    console.error('❌ Error fetching orders:', err);
    return { 
      orders: [], 
      error: err instanceof Error ? err.message : 'Unknown error' 
    };
  }
}

export async function getOrderDetails(orderId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        buyer:profiles!orders_buyer_id_fkey(id, full_name, email, phone_number, state, university:universities(name)),
        seller:sellers!orders_seller_id_fkey(id, business_name, full_name, email, phone_number, state, university:universities(name)),
        product:products(id, name, image_urls, condition, brand),
        delivery_address:delivery_addresses(id, address_line, city, state, postal_code)
      `)
      .eq('id', orderId)
      .single();

    if (error) throw error;

    // Transform to ensure single objects
    const transformedOrder = {
      ...data,
      buyer: Array.isArray(data.buyer) ? data.buyer[0] : data.buyer,
      seller: Array.isArray(data.seller) ? data.seller[0] : data.seller,
      product: Array.isArray(data.product) ? data.product[0] : data.product,
      delivery_address: Array.isArray(data.delivery_address) ? data.delivery_address[0] : data.delivery_address,
    };

    return { order: transformedOrder, error: null };
  } catch (err) {
    return { order: null, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function releaseEscrow(orderId: string) {
  try {
    const { supabase } = await verifyAdmin();

    const { data: order } = await supabase
      .from('orders')
      .select('escrow_amount, seller_id, seller_payout_amount, product:products(name)')
      .eq('id', orderId)
      .single();

    if (!order) throw new Error('Order not found');
    if (parseFloat(order.escrow_amount) <= 0) throw new Error('No escrow to release');

    const { error: escrowError } = await supabase
      .from('orders')
      .update({
        escrow_released: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (escrowError) throw escrowError;

    // Update seller wallet
    const { data: seller } = await supabase
      .from('sellers')
      .select('wallet_balance')
      .eq('id', order.seller_id)
      .single();

    if (seller) {
      const newBalance = parseFloat(seller.wallet_balance || '0') + parseFloat(order.seller_payout_amount);
      await supabase
        .from('sellers')
        .update({ wallet_balance: newBalance.toString() })
        .eq('id', order.seller_id);
    }

    const productData = Array.isArray(order.product) ? order.product[0] : order.product;
    await supabase.from('notifications').insert({
      user_id: order.seller_id,
      type: 'escrow_released',
      title: 'Payment Released 💰',
      message: `Escrow funds for "${productData?.name || 'order'}" have been released to your wallet.`,
      is_read: false,
    });

    revalidatePath('/admin/dashboard/orders');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function refundOrder(orderId: string, reason: string) {
  try {
    const { supabase } = await verifyAdmin();

    // Get complete order details with seller wallet info
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        buyer:profiles!orders_buyer_id_fkey(id, full_name, email),
        seller:sellers!orders_seller_id_fkey(id, user_id, wallet_balance, business_name, full_name, email),
        product:products(name)
      `)
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      throw new Error('Order not found');
    }

    console.log('📦 Processing refund for order:', order.order_number);

    // Call your refund-escrow edge function
    // This handles: Paystack refund, order status update, notifications, emails
    const { data: refundResult, error: refundError } = await supabase.functions.invoke('refund-escrow', {
      body: {
        orderId: orderId,
        reason: reason,
        isAutoRefund: false,
      },
    });

    if (refundError) {
      console.error('❌ Edge function error:', refundError);
      throw new Error(`Refund failed: ${refundError.message}`);
    }

    console.log('✅ Refund edge function completed:', refundResult);

    // Handle seller wallet deduction for non-POD orders
    const isPOD = order.payment_method === 'pod';
    const escrowAmount = parseFloat(order.escrow_amount || '0');
    
    if (!isPOD && escrowAmount > 0) {
      const sellerData = Array.isArray(order.seller) ? order.seller[0] : order.seller;
      
      if (sellerData && sellerData.id) {
        const currentBalance = parseFloat(sellerData.wallet_balance || '0');
        
        console.log('💳 Deducting from seller wallet:');
        console.log('  Seller:', sellerData.business_name || sellerData.full_name);
        console.log('  Current balance:', currentBalance);
        console.log('  Refund amount:', escrowAmount);
        
        // Only deduct if wallet has sufficient balance
        // If balance is insufficient, it means the money was never added (order wasn't completed)
        if (currentBalance >= escrowAmount) {
          const newBalance = currentBalance - escrowAmount;
          console.log('  New balance:', newBalance);

          const { error: walletError } = await supabase
            .from('sellers')
            .update({ 
              wallet_balance: newBalance.toString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', sellerData.id);

          if (walletError) {
            console.error('⚠️ Failed to update seller wallet:', walletError);
            // Log but don't throw - refund was still processed
            
            // Create notification to seller about the issue
            if (sellerData.user_id) {
              await supabase.from('notifications').insert({
                user_id: sellerData.user_id,
                type: 'system_alert',
                title: 'Wallet Update Issue ⚠️',
                message: `Order ${order.order_number} was refunded but there was an issue updating your wallet. Please contact support.`,
                is_read: false,
              });
            }
          } else {
            console.log('✅ Seller wallet updated successfully');
            
            // Create notification about wallet deduction
            if (sellerData.user_id) {
              await supabase.from('notifications').insert({
                user_id: sellerData.user_id,
                type: 'wallet_debit',
                title: 'Refund Processed 💸',
                message: `₦${escrowAmount.toFixed(0)} was deducted from your wallet due to order ${order.order_number} refund.`,
                amount: escrowAmount,
                is_read: false,
              });
            }
          }
        } else {
          console.log('⚠️ Insufficient wallet balance for deduction. Skipping wallet update.');
          console.log('  This likely means the order was refunded before escrow was released.');
        }
      } else {
        console.error('⚠️ Seller data not found for wallet update');
      }
    } else {
      console.log('ℹ️ No wallet deduction needed (POD order or zero escrow)');
    }

    revalidatePath('/admin/dashboard/orders');
    revalidatePath('/dashboard/finance'); // Refresh seller's finance page too
    
    return { 
      success: true, 
      error: null, 
      message: refundResult?.message || 'Refund processed successfully',
      refundResult 
    };
    
  } catch (err) {
    console.error('❌ Refund error:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Refund failed' 
    };
  }
}

export async function cancelOrder(orderId: string, reason: string) {
  try {
    const { supabase } = await verifyAdmin();

    const { data: order } = await supabase
      .from('orders')
      .select('buyer_id, seller_id, product:products(name)')
      .eq('id', orderId)
      .single();

    if (!order) throw new Error('Order not found');

    const { error } = await supabase
      .from('orders')
      .update({
        order_status: 'cancelled',
        notes: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) throw error;

    const productData = Array.isArray(order.product) ? order.product[0] : order.product;
    await supabase.from('notifications').insert([
      {
        user_id: order.buyer_id,
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: `Your order for "${productData?.name || 'product'}" has been cancelled. Reason: ${reason}`,
        is_read: false,
      },
      {
        user_id: order.seller_id,
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: `Order for "${productData?.name || 'product'}" has been cancelled by admin.`,
        is_read: false,
      },
    ]);

    revalidatePath('/admin/dashboard/orders');
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}