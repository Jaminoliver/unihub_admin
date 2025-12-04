import { createClient } from '@supabase/supabase-js';
import { GoogleAuth } from 'google-auth-library';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getAccessToken() {
  const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON not set');
  }
  const credentials = JSON.parse(serviceAccountJson);
  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const token = await auth.getAccessToken();
  return {
    token,
    projectId: credentials.project_id,
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body = await req.json();
    const {
      title,
      message,
      imageUrl,
      deepLink,
      actionButtons,
      targetAudience,
      scheduleTime,
      abTestEnabled,
    } = body;

    console.log('📋 Request body:', JSON.stringify(body, null, 2));

    // Validate
    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message required' }, { status: 400 });
    }

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('notification_campaigns')
      .insert({
        name: title,
        type: scheduleTime ? 'scheduled' : targetAudience?.all_users ? 'broadcast' : 'targeted',
        status: scheduleTime ? 'scheduled' : 'sending',
        title,
        message,
        image_url: imageUrl,
        deep_link: deepLink,
        action_buttons: actionButtons || [],
        target_audience: targetAudience || { all_users: true, states: [], universities: [], user_types: [] },
        schedule_time: scheduleTime,
        ab_test_enabled: abTestEnabled || false,
      })
      .select()
      .single();

    if (campaignError) {
      console.error('❌ Campaign creation error:', campaignError);
      throw campaignError;
    }

    console.log('✅ Campaign created:', campaign.id);

    // If scheduled, stop here
    if (scheduleTime) {
      return NextResponse.json({ success: true, campaign, message: 'Campaign scheduled' });
    }

    // Get target users based on user type
    let userIds: string[] = [];

    if (targetAudience?.all_users) {
      console.log('🌍 Targeting ALL users');
      
      // Get all users from profiles
      const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id');
      
      if (profilesError) {
        console.error('❌ Profiles query error:', profilesError);
        throw profilesError;
      }
      
      console.log(`👥 Found ${profiles?.length || 0} profiles`);
      userIds = profiles?.map(p => p.id) || [];
    } else {
      console.log('🎯 Targeted audience:', targetAudience);
      
      // Get buyers and/or sellers based on target
      const includesBuyers = targetAudience?.user_types?.includes('buyer') || targetAudience?.user_types?.length === 0;
      const includesSellers = targetAudience?.user_types?.includes('seller') || targetAudience?.user_types?.length === 0;

      console.log(`Includes buyers: ${includesBuyers}, Includes sellers: ${includesSellers}`);

      if (includesBuyers) {
        // Get from profiles (buyers)
        let query = supabase.from('profiles').select('id');

        if (targetAudience?.states?.length > 0) {
          console.log('🗺️ Filtering by states:', targetAudience.states);
          query = query.in('state', targetAudience.states);
        }
        if (targetAudience?.universities?.length > 0) {
          console.log('🎓 Filtering by universities:', targetAudience.universities);
          
          // Get university IDs from names
          const { data: unis } = await supabase
            .from('universities')
            .select('id')
            .in('name', targetAudience.universities);
          
          console.log(`Found ${unis?.length || 0} university IDs`);
          
          if (unis && unis.length > 0) {
            query = query.in('university_id', unis.map(u => u.id));
          }
        }

        const { data: buyers, error: buyersError } = await query;
        
        if (buyersError) {
          console.error('❌ Buyers query error:', buyersError);
        } else {
          console.log(`👤 Found ${buyers?.length || 0} buyers`);
          if (buyers) userIds.push(...buyers.map(b => b.id));
        }
      }

      if (includesSellers) {
        // Get from sellers table
        let query = supabase.from('sellers').select('user_id');

        if (targetAudience?.states?.length > 0) {
          query = query.in('state', targetAudience.states);
        }
        if (targetAudience?.universities?.length > 0) {
          const { data: unis } = await supabase
            .from('universities')
            .select('id')
            .in('name', targetAudience.universities);
          
          if (unis && unis.length > 0) {
            query = query.in('university_id', unis.map(u => u.id));
          }
        }

        const { data: sellers, error: sellersError } = await query;
        
        if (sellersError) {
          console.error('❌ Sellers query error:', sellersError);
        } else {
          console.log(`🏪 Found ${sellers?.length || 0} sellers`);
          if (sellers) userIds.push(...sellers.map(s => s.user_id));
        }
      }

      // Remove duplicates
      userIds = [...new Set(userIds)];
    }

    console.log(`📊 Total unique user IDs: ${userIds.length}`);

    if (userIds.length === 0) {
      return NextResponse.json({ 
        error: 'No users found for target audience',
        debug: {
          targetAudience,
          userIds: []
        }
      }, { status: 400 });
    }

    // Get FCM tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('token, user_id, device_type')
      .in('user_id', userIds);

    if (tokensError) {
      console.error('❌ FCM tokens query error:', tokensError);
      throw tokensError;
    }

    console.log(`📱 Found ${tokens?.length || 0} FCM tokens`);
    console.log('Token details:', tokens?.map(t => ({ user_id: t.user_id, device_type: t.device_type })));

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ 
        error: 'No FCM tokens found for target users',
        debug: {
          targetedUserIds: userIds.slice(0, 10),
          totalUsers: userIds.length,
          message: 'Users need to open the Flutter app to register FCM tokens'
        }
      }, { status: 400 });
    }

    // Send via FCM
    const { token: accessToken, projectId } = await getAccessToken();
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    let sentCount = 0;
    let deliveredCount = 0;
    const notifications = [];

    for (const t of tokens) {
      try {
        const payload = {
          message: {
            token: t.token,
            notification: { title, body: message },
            data: {
              campaign_id: campaign.id,
              deep_link: deepLink || '',
              image_url: imageUrl || '',
            },
            ...(imageUrl && {
              android: { notification: { image: imageUrl } },
              apns: { payload: { aps: { 'mutable-content': 1 }, fcm_options: { image: imageUrl } } },
            }),
          },
        };

        const fcmResponse = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        });

        if (fcmResponse.ok) {
          sentCount++;
          deliveredCount++;

          // Save notification
          const { data: notif } = await supabase
            .from('notifications')
            .insert({
              user_id: t.user_id,
              campaign_id: campaign.id,
              type: 'admin_notification',
              title,
              message,
              image_url: imageUrl,
              deep_link: deepLink,
              action_buttons: actionButtons || [],
              is_read: false,
            })
            .select()
            .single();

          notifications.push(notif);

          // Analytics
          await supabase.from('notification_analytics').insert({
            campaign_id: campaign.id,
            notification_id: notif?.id,
            user_id: t.user_id,
            device_type: t.device_type,
            fcm_token: t.token,
            delivered_at: new Date().toISOString(),
          });
        } else {
          const error = await fcmResponse.text();
          console.error(`❌ FCM send failed for user ${t.user_id}:`, error);
        }
      } catch (err) {
        console.error('FCM send error:', err);
      }
    }

    console.log(`✅ Sent: ${sentCount}, Delivered: ${deliveredCount}`);

    // Update campaign stats
    await supabase
      .from('notification_campaigns')
      .update({
        status: 'sent',
        sent_count: sentCount,
        delivered_count: deliveredCount,
        sent_at: new Date().toISOString(),
      })
      .eq('id', campaign.id);

    return NextResponse.json({
      success: true,
      campaign,
      sentCount,
      deliveredCount,
      notifications,
      debug: {
        totalUsers: userIds.length,
        tokensFound: tokens.length,
      }
    });
  } catch (error: any) {
    console.error('Send notification error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}