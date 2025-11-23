import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, message } = body;

    console.log('=== APPEAL API START ===');
    console.log('Authenticated User ID:', user.id);
    console.log('Product ID:', productId);
    console.log('Message:', message?.substring(0, 50) + '...');

    // Validate input
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Appeal message is required' },
        { status: 400 }
      );
    }

    if (message.length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters' },
        { status: 400 }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Message must be less than 1000 characters' },
        { status: 400 }
      );
    }

    // Get the product FIRST to check seller_id
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, seller_id, is_suspended, admin_suspended, name')
      .eq('id', productId)
      .single();

    console.log('Product query result:', { 
      found: !!product, 
      productSellerId: product?.seller_id,
      error: productError 
    });

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Get seller info using the seller_id from the product
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('id, user_id, business_name')
      .eq('id', product.seller_id)
      .single();

    console.log('Seller query result:', { 
      found: !!seller,
      sellerId: seller?.id,
      sellerUserId: seller?.user_id,
      authenticatedUserId: user.id,
      match: seller?.user_id === user.id,
      error: sellerError 
    });

    if (sellerError || !seller) {
      return NextResponse.json(
        { error: 'Seller account not found for this product' },
        { status: 404 }
      );
    }

    // Check if the authenticated user owns this seller account
    if (seller.user_id !== user.id) {
      console.error('OWNERSHIP MISMATCH:', {
        authenticatedUserId: user.id,
        sellerUserId: seller.user_id,
        sellerId: seller.id,
        productSellerId: product.seller_id
      });
      return NextResponse.json(
        { error: 'You do not have permission to appeal this product. This product belongs to a different seller account.' },
        { status: 403 }
      );
    }

    // Check if product is actually suspended (either type)
    if (!product.is_suspended && !product.admin_suspended) {
      return NextResponse.json(
        { error: 'This product is not suspended and does not need an appeal' },
        { status: 400 }
      );
    }

    // Check if there's already a pending appeal
    const { data: existingAppeal, error: existingError } = await supabase
      .from('appeals')
      .select('id, status, created_at')
      .eq('product_id', productId)
      .eq('status', 'pending')
      .maybeSingle();

    console.log('Existing appeal check:', { 
      exists: !!existingAppeal,
      appealId: existingAppeal?.id,
      error: existingError 
    });

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing appeal:', existingError);
      return NextResponse.json(
        { error: 'Database error while checking existing appeals' },
        { status: 500 }
      );
    }

    if (existingAppeal) {
      return NextResponse.json(
        { error: 'An appeal is already pending for this product. Please wait for admin review.' },
        { status: 400 }
      );
    }

    // Create the appeal
    const appealData = {
      product_id: productId,
      seller_id: seller.id,
      message: message.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    console.log('Creating appeal with data:', appealData);

    const { data: appeal, error: appealError } = await supabase
      .from('appeals')
      .insert(appealData)
      .select()
      .single();

    if (appealError) {
      console.error('Error creating appeal:', appealError);
      return NextResponse.json(
        { error: `Failed to create appeal: ${appealError.message}` },
        { status: 500 }
      );
    }

    console.log('=== APPEAL CREATED SUCCESSFULLY ===');
    console.log('Appeal ID:', appeal.id);

    // Optional: Create notification for admins
    try {
      await supabase.from('notifications').insert({
        type: 'new_appeal',
        title: 'New Product Appeal',
        message: `${seller.business_name || 'A seller'} has submitted an appeal for product "${product.name}"`,
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } catch (notifError) {
      console.warn('Failed to create admin notification:', notifError);
    }

    return NextResponse.json(
      { 
        success: true, 
        appeal,
        message: 'Appeal submitted successfully. An admin will review it shortly.' 
      }, 
      { status: 201 }
    );

  } catch (error) {
    console.error('=== APPEAL API ERROR ===');
    console.error('Appeal submission error:', error);
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user is admin - CRITICAL FIX
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log('=== ADMIN CHECK ===');
    console.log('User ID:', user.id);
    console.log('Admin Record:', admin);
    console.log('Admin Error:', adminError);

    if (adminError) {
      console.error('Error checking admin status:', adminError);
      return NextResponse.json(
        { error: 'Error verifying admin status' },
        { status: 500 }
      );
    }

    if (!admin) {
      console.error('User is not an admin:', user.id);
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { appealId, status, reason, action } = body;

    console.log('=== APPEAL UPDATE REQUEST ===');
    console.log('Admin ID:', admin.id);
    console.log('Appeal ID:', appealId);
    console.log('New Status:', status);
    console.log('Action:', action);
    console.log('Reason:', reason);

    // Validate input
    if (!appealId || !status) {
      return NextResponse.json(
        { error: 'Appeal ID and status are required' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "approved" or "rejected"' },
        { status: 400 }
      );
    }

    if (status === 'rejected' && !reason) {
      return NextResponse.json(
        { error: 'Reason is required for rejections' },
        { status: 400 }
      );
    }

    // Get the appeal with product and seller info
    const { data: appeal, error: appealError } = await supabase
      .from('appeals')
      .select(`
        *,
        products(id, name, seller_id, admin_suspended, is_suspended),
        sellers(id, user_id, business_name)
      `)
      .eq('id', appealId)
      .single();

    console.log('=== APPEAL FETCH ===');
    console.log('Appeal found:', !!appeal);
    console.log('Appeal data:', appeal);
    console.log('Appeal error:', appealError);

    if (appealError || !appeal) {
      console.error('Error fetching appeal:', appealError);
      return NextResponse.json(
        { error: 'Appeal not found' },
        { status: 404 }
      );
    }

    if (appeal.status !== 'pending') {
      return NextResponse.json(
        { error: `This appeal has already been ${appeal.status}` },
        { status: 400 }
      );
    }

    // Update appeal status FIRST
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Add admin_reason for rejections
    if (status === 'rejected' && reason) {
      updateData.admin_reason = reason;
    }

    console.log('=== UPDATING APPEAL ===');
    console.log('Update data:', updateData);

    const { data: updatedAppeal, error: updateError } = await supabase
      .from('appeals')
      .update(updateData)
      .eq('id', appealId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating appeal:', updateError);
      return NextResponse.json(
        { error: `Failed to update appeal status: ${updateError.message}` },
        { status: 500 }
      );
    }

    console.log('✅ Appeal status updated successfully');
    console.log('Updated appeal:', updatedAppeal);

    // Extract product and seller data
    const products = Array.isArray(appeal.products) ? appeal.products[0] : appeal.products;
    const sellers = Array.isArray(appeal.sellers) ? appeal.sellers[0] : appeal.sellers;

    // If approved, handle product unsuspension
    if (status === 'approved') {
      if (action === 'unsuspend' && products?.id) {
        console.log('=== UNSUSPENDING PRODUCT ===');
        console.log('Product ID:', products.id);
        
        const { data: unsuspendedProduct, error: productError } = await supabase
          .from('products')
          .update({ 
            admin_suspended: false,
            admin_suspension_reason: null,
            admin_suspended_at: null,
            admin_suspended_by: null,
            is_available: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', products.id)
          .select()
          .single();

        if (productError) {
          console.error('Error unsuspending product:', productError);
          return NextResponse.json(
            { error: `Appeal approved but failed to unsuspend product: ${productError.message}` },
            { status: 500 }
          );
        }

        console.log('✅ Product unsuspended successfully');
        console.log('Updated product:', unsuspendedProduct);
      }

      // Notify seller of approval
      if (sellers?.user_id) {
        console.log('=== SENDING APPROVAL NOTIFICATION ===');
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: sellers.user_id,
          type: 'appeal_approved',
          title: 'Appeal Approved ✅',
          message: `Your appeal for "${products?.name || 'your product'}" has been approved${action === 'unsuspend' ? ' and the product has been unsuspended' : ''}.`,
          is_read: false,
          created_at: new Date().toISOString(),
        });

        if (notifError) {
          console.warn('Failed to send approval notification:', notifError);
        } else {
          console.log('✅ Approval notification sent');
        }
      }
    } 
    // If rejected, notify seller
    else if (status === 'rejected') {
      console.log('=== APPEAL REJECTED ===');
      console.log('Product remains suspended');
      
      if (sellers?.user_id) {
        console.log('=== SENDING REJECTION NOTIFICATION ===');
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: sellers.user_id,
          type: 'appeal_rejected',
          title: 'Appeal Rejected ❌',
          message: `Your appeal for "${products?.name || 'your product'}" has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
          is_read: false,
          created_at: new Date().toISOString(),
        });

        if (notifError) {
          console.warn('Failed to send rejection notification:', notifError);
        } else {
          console.log('✅ Rejection notification sent');
        }
      }
    }

    console.log('=== APPEAL UPDATE COMPLETED SUCCESSFULLY ===');

    return NextResponse.json(
      { 
        success: true,
        appeal: updatedAppeal,
        message: `Appeal ${status} successfully` 
      }, 
      { status: 200 }
    );

  } catch (error) {
    console.error('=== APPEAL UPDATE ERROR ===');
    console.error('Appeal update error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}