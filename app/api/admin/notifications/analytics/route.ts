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

    // Overall stats
    let analyticsQuery = supabase
      .from('notification_analytics')
      .select('*')
      .gte('sent_at', startDate.toISOString());

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
      stats.openRate = (stats.opened / stats.delivered) * 100;
      stats.clickRate = (stats.clicked / stats.opened) * 100;
    }

    // Campaign stats
    const { data: campaigns } = await supabase
      .from('notification_campaigns')
      .select('*')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(10);

    return NextResponse.json({ stats, campaigns, analytics });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}