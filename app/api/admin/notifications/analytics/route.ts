import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');
    const days = parseInt(searchParams.get('days') || '7');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Overall stats - FIXED: Use delivered_at instead of sent_at
    let analyticsQuery = supabase
      .from('notification_analytics')
      .select('*')
      .gte('delivered_at', startDate.toISOString());  // ✅ FIXED

    if (campaignId) {
      analyticsQuery = analyticsQuery.eq('campaign_id', campaignId);
    }

    const { data: analytics, error } = await analyticsQuery;
    if (error) throw error;

    const stats = {
      totalSent: analytics?.length || 0,
      delivered: analytics?.filter(a => a.delivered_at).length || 0,
      opened: analytics?.filter(a => a.opened_at).length || 0,
      clicked: analytics?.filter(a => a.clicked_at).length || 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
    };

    if (stats.totalSent > 0) {
      stats.deliveryRate = (stats.delivered / stats.totalSent) * 100;
    }
    
    if (stats.delivered > 0) {
      stats.openRate = (stats.opened / stats.delivered) * 100;
    }
    
    if (stats.opened > 0) {
      stats.clickRate = (stats.clicked / stats.opened) * 100;
    }

    // Campaign stats - FIXED: Filter by created_at within date range
    const { data: campaigns } = await supabase
      .from('notification_campaigns')
      .select('*')
      .eq('status', 'sent')
      .gte('created_at', startDate.toISOString())  // ✅ ADDED: Filter by date range
      .order('created_at', { ascending: false })  // ✅ FIXED: Order by created_at
      .limit(10);

    return NextResponse.json({ stats, campaigns, analytics });
  } catch (error: any) {
    console.error('Analytics API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}